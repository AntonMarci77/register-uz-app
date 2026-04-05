import { NextRequest, NextResponse } from "next/server";
import { queryRows, queryCount } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/statements - Get financial reports (výkazy) with filtering and pagination
 *
 * Uses FinancialReport table (994k rows). Currently titulná strana fields
 * and tabulky are mostly NULL — content sync is pending. Shows available metadata.
 *
 * Query Parameters:
 * - page, limit, template_id, period_from, period_to, search, ico, sortBy, sortDir
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Filters
    const templateId = searchParams.get("template_id")
      ? parseInt(searchParams.get("template_id")!, 10)
      : undefined;
    const obdobieOd = searchParams.get("period_from") || searchParams.get("obdobieOd") || undefined;
    const obdobieDo = searchParams.get("period_to") || searchParams.get("obdobieDo") || undefined;
    const search = searchParams.get("search") || undefined;
    const ico = searchParams.get("ico") || undefined;
    const typ = searchParams.get("statement_type") || searchParams.get("typ") || undefined;

    // Sorting
    const sortByParam = searchParams.get("sortBy") || "datumPoslednejUpravy";
    const validSortFields = ["datumPoslednejUpravy", "tsObdobieDo", "tsObdobieOd", "idSablony"];
    const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "datumPoslednejUpravy";
    const sortDir = (searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    // Build WHERE clause
    const whereClauses: string[] = ["r.zmazany = false"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (templateId !== undefined) {
      whereClauses.push(`r."idSablony" = $${paramIndex}`);
      params.push(templateId);
      paramIndex++;
    }

    if (obdobieOd) {
      const isYear = /^\d{4}$/.test(obdobieOd);
      whereClauses.push(`r."tsObdobieOd" >= $${paramIndex}`);
      params.push(isYear ? `${obdobieOd}-01` : obdobieOd);
      paramIndex++;
    }

    if (obdobieDo) {
      const isYear = /^\d{4}$/.test(obdobieDo);
      whereClauses.push(`r."tsObdobieDo" <= $${paramIndex}`);
      params.push(isYear ? `${obdobieDo}-12` : obdobieDo);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`r."tsNazovUJ" ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (ico) {
      whereClauses.push(`r."tsICO" = $${paramIndex}`);
      params.push(ico);
      paramIndex++;
    }

    if (typ) {
      whereClauses.push(`r."tsTypZavierky" = $${paramIndex}`);
      params.push(typ);
      paramIndex++;
    }

    const whereClause = whereClauses.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) as count FROM "FinancialReport" r WHERE ${whereClause}`;
    const total = await queryCount(countSql, params);

    // Main query
    const selectSql = `
      SELECT
        r.id,
        r."idSablony",
        r."idUctovnejZavierky",
        r."tsNazovUJ",
        r."tsICO",
        r."tsTypZavierky",
        r."tsKonsolidovana",
        r."tsTypUctovnejJednotky",
        r."tsObdobieOd",
        r."tsObdobieDo",
        r."datumPoslednejUpravy",
        r.mena,
        r."pristupnostDat",
        t.nazov as "sablonaNazov",
        CASE
          WHEN r.tabulky IS NOT NULL AND jsonb_typeof(r.tabulky) = 'array' AND jsonb_array_length(r.tabulky) > 0
          THEN r.tabulky->0->'data'->>0
          ELSE NULL
        END as "totalAssets"
      FROM "FinancialReport" r
      LEFT JOIN "ReportTemplate" t ON r."idSablony" = t.id
      WHERE ${whereClause}
      ORDER BY r."${sortBy}" ${sortDir} NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const reports = await queryRows<any>(selectSql, [...params, limit, offset]);
    const totalPages = Math.ceil(total / limit);

    const data = reports.map((r: any) => ({
      id: String(r.id),
      entity_id: r.tsICO || "",
      entity_name: r.tsNazovUJ || "",
      entity_ico: r.tsICO || "",
      statement_type: r.tsTypZavierky || getTemplateName(r.sablonaNazov) || `Šablóna #${r.idSablony || "?"}`,
      period_from: r.tsObdobieOd || "",
      period_to: r.tsObdobieDo || "",
      consolidated: r.tsKonsolidovana || false,
      filing_date: r.datumPoslednejUpravy,
      total_assets: parseFinancialValue(r.totalAssets),
      total_liabilities: null as number | null,
      total_equity: null as number | null,
      net_income: null as number | null,
      template_id: r.idSablony,
      template_name: getTemplateName(r.sablonaNazov),
      entity_type: r.tsTypUctovnejJednotky || "",
      currency: r.mena || "EUR",
      accessibility: r.pristupnostDat || "",
      statement_id: r.idUctovnejZavierky,
      url: "",
    }));

    return NextResponse.json(
      { data, total, page, limit, pages: totalPages },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching statements:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch statements",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function parseFinancialValue(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "null") return null;
  const str = typeof val === "string" ? val.replace(/"/g, "") : String(val);
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

function getTemplateName(nazov: any): string {
  if (!nazov) return "";
  if (typeof nazov === "string") {
    try {
      const parsed = JSON.parse(nazov);
      return parsed.sk || parsed.en || nazov;
    } catch {
      return nazov;
    }
  }
  if (typeof nazov === "object") return nazov.sk || nazov.en || "";
  return String(nazov);
}
