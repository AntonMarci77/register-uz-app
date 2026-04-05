import { NextRequest, NextResponse } from "next/server";
import { query, queryRows, queryCount, getNazovSK } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/statements - Get financial statements with filtering and pagination
 *
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 20, max: 100) - Items per page
 * - idUJ: number - Filter by accounting entity ID
 * - typ: string - Filter by statement type (Riadna, Mimoriadna, Priebežná, Kombinovaná)
 * - konsolidovana: boolean (true | false) - Filter consolidated statements
 * - obdobieOd: string (YYYY-MM) - Filter by period start
 * - obdobieDo: string (YYYY-MM) - Filter by period end
 * - template_id: number - Filter by template ID
 * - sortBy: string (default: "obdobieDo") - Field to sort by
 * - sortDir: "asc" | "desc" (default: "desc") - Sort direction
 */

type SortField = "obdobieDo" | "obdobieOd" | "datumPodania" | "datumPoslednejUpravy";
type SortDirection = "asc" | "desc";

interface StatementRow {
  id: number;
  obdobieOd: string;
  obdobieDo: string;
  datumPodania: string | null;
  datumZostavenia: string | null;
  datumSchvalenia: string | null;
  typ: string;
  konsolidovana: boolean;
  konsolidovanaUstredna: boolean;
  suhrnnaVerejnaSprava: boolean;
  datumPoslednejUpravy: string | null;
  idUJ: number;
  entity_id: number;
  entity_nazovUJ: string;
  entity_ico: string;
  pocetVykazov: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Filters (accept both frontend and DB-style parameter names)
    const idUJ = searchParams.get("idUJ") ? parseInt(searchParams.get("idUJ")!, 10) : undefined;
    const typ = searchParams.get("statement_type") || searchParams.get("typ") || undefined;
    const konsolidovanaParam = searchParams.get("consolidated") || searchParams.get("konsolidovana");
    const konsolidovana =
      konsolidovanaParam !== null ? konsolidovanaParam.toLowerCase() === "true" : undefined;
    const obdobieOd = searchParams.get("period_from") || searchParams.get("obdobieOd") || undefined;
    const obdobieDo = searchParams.get("period_to") || searchParams.get("obdobieDo") || undefined;
    const templateId = searchParams.get("template_id") ? parseInt(searchParams.get("template_id")!, 10) : undefined;

    // Sorting
    const sortByParam = searchParams.get("sortBy") || "obdobieDo";
    const sortDirParam = (searchParams.get("sortDir") || "desc").toLowerCase();

    const sortBy = validateSortField(sortByParam) ? (sortByParam as SortField) : ("obdobieDo" as SortField);
    const sortDir = sortDirParam === "asc" ? ("asc" as const) : ("desc" as const);

    // Build SQL WHERE clause and parameters
    const whereClauses: string[] = ["fs.zmazana = false"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (idUJ !== undefined) {
      whereClauses.push(`fs."idUJ" = $${paramIndex}`);
      params.push(idUJ);
      paramIndex++;
    }

    if (typ) {
      whereClauses.push(`fs.typ = $${paramIndex}`);
      params.push(typ);
      paramIndex++;
    }

    if (konsolidovana !== undefined) {
      whereClauses.push(`fs.konsolidovana = $${paramIndex}`);
      params.push(konsolidovana);
      paramIndex++;
    }

    if (obdobieOd) {
      // Frontend sends year (e.g. 2009), convert to date
      const isYear = /^\d{4}$/.test(obdobieOd);
      whereClauses.push(`fs."obdobieOd" >= $${paramIndex}`);
      params.push(isYear ? `${obdobieOd}-01-01` : obdobieOd);
      paramIndex++;
    }

    if (obdobieDo) {
      const isYear = /^\d{4}$/.test(obdobieDo);
      whereClauses.push(`fs."obdobieDo" <= $${paramIndex}`);
      params.push(isYear ? `${obdobieDo}-12-31` : obdobieDo);
      paramIndex++;
    }

    if (templateId !== undefined) {
      whereClauses.push(
        `fs.id IN (SELECT "idUctovnejZavierky" FROM "FinancialReport" WHERE "idSablony" = $${paramIndex})`
      );
      params.push(templateId);
      paramIndex++;
    }

    const whereClause = whereClauses.join(" AND ");

    // Build ORDER BY clause
    const orderClause = `fs."${sortBy}" ${sortDir.toUpperCase()}`;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM "FinancialStatement" fs
      WHERE ${whereClause}
    `;

    const totalResult = await queryCount(countQuery, params);
    const total = totalResult;

    // Get paginated results
    const selectQuery = `
      SELECT
        fs.id,
        fs."obdobieOd",
        fs."obdobieDo",
        fs."datumPodania",
        fs."datumZostavenia",
        fs."datumSchvalenia",
        fs.typ,
        fs.konsolidovana,
        fs."konsolidovanaUstredna",
        fs."suhrnnaVerejnaSprava",
        fs."datumPoslednejUpravy",
        fs."idUJ",
        ae.id as entity_id,
        ae."nazovUJ" as entity_nazovUJ,
        ae.ico as entity_ico,
        (SELECT COUNT(*) FROM "FinancialReport" WHERE "idUctovnejZavierky" = fs.id) as "pocetVykazov"
      FROM "FinancialStatement" fs
      LEFT JOIN "AccountingEntity" ae ON fs."idUJ" = ae.id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const queryParams = [...params, limit, offset];
    const statements = await queryRows<StatementRow>(selectQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    // Transform response to match frontend Statement type
    const data = statements.map((stmt) => ({
      id: String(stmt.id),
      entity_id: String(stmt.entity_id || stmt.idUJ),
      entity_name: stmt.entity_nazovUJ || "",
      statement_type: stmt.typ || "",
      period_from: stmt.obdobieOd,
      period_to: stmt.obdobieDo,
      consolidated: stmt.konsolidovana,
      filing_date: stmt.datumPodania,
      total_assets: null as number | null,
      total_liabilities: null as number | null,
      total_equity: null as number | null,
      net_income: null as number | null,
      url: "",
      pocetVykazov: stmt.pocetVykazov,
    }));

    return NextResponse.json(
      {
        data,
        total,
        page,
        limit,
        pages: totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching statements:", error);
    return NextResponse.json(
      { error: "Failed to fetch statements", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function validateSortField(field: string): boolean {
  const validFields: SortField[] = ["obdobieDo", "obdobieOd", "datumPodania", "datumPoslednejUpravy"];
  return validFields.includes(field as SortField);
}
