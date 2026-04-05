import { NextRequest, NextResponse } from "next/server";
import { queryRows, queryCount } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/statements - Get financial reports (výkazy) with filtering and pagination
 *
 * Uses FinancialReport table which contains denormalized titulná strana data
 * and full financial tables (tabulky JSONB). This replaces the empty
 * FinancialStatement table approach.
 *
 * Query Parameters:
 * - page: number (default: 1) - Page number
 * - limit: number (default: 20, max: 100) - Items per page
 * - ico: string - Filter by company ICO
 * - search: string - Search by company name (ILIKE)
 * - statement_type / typ: string - Filter by statement type (Riadna, Mimoriadna, Priebežná)
 * - consolidated / konsolidovana: boolean - Filter consolidated
 * - period_from / obdobieOd: string - Filter by period start (year or YYYY-MM)
 * - period_to / obdobieDo: string - Filter by period end (year or YYYY-MM)
 * - template_id: number - Filter by template ID (šablóna)
 * - entity_type: string - Filter by entity type (malá, veľká, mikro)
 * - sortBy: string - Sort field
 * - sortDir: asc | desc - Sort direction
 */

interface ReportRow {
  id: number;
  idSablony: number | null;
  tsNazovUJ: string | null;
  tsICO: string | null;
  tsPravnaForma: string | null;
  tsSkNace: string | null;
  tsTypZavierky: string | null;
  tsKonsolidovana: boolean;
  tsTypUctovnejJednotky: string | null;
  tsObdobieOd: string | null;
  tsObdobieDo: string | null;
  tsPredchObdobieOd: string | null;
  tsPredchObdobieDo: string | null;
  datumPoslednejUpravy: string | null;
  idUctovnejZavierky: number | null;
  tabulky: any;
  mena: string | null;
  sablona_nazov: any;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Filters
    const ico = searchParams.get("ico") || undefined;
    const search = searchParams.get("search") || undefined;
    const typ = searchParams.get("statement_type") || searchParams.get("typ") || undefined;
    const konsolidovanaParam = searchParams.get("consolidated") || searchParams.get("konsolidovana");
    const konsolidovana =
      konsolidovanaParam !== null ? konsolidovanaParam.toLowerCase() === "true" : undefined;
    const obdobieOd = searchParams.get("period_from") || searchParams.get("obdobieOd") || undefined;
    const obdobieDo = searchParams.get("period_to") || searchParams.get("obdobieDo") || undefined;
    const templateId = searchParams.get("template_id")
      ? parseInt(searchParams.get("template_id")!, 10)
      : undefined;
    const entityType = searchParams.get("entity_type") || undefined;

    // Sorting
    const sortByParam = searchParams.get("sortBy") || "tsObdobieDo";
    const sortDirParam = (searchParams.get("sortDir") || "desc").toLowerCase();

    const validSortFields = [
      "tsObdobieDo",
      "tsObdobieOd",
      "datumPoslednejUpravy",
      "tsNazovUJ",
      "tsICO",
    ];
    const sortBy = validSortFields.includes(sortByParam) ? sortByParam : "tsObdobieDo";
    const sortDir = sortDirParam === "asc" ? "ASC" : "DESC";

    // Build WHERE clause
    const whereClauses: string[] = ["r.zmazany = false"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (ico) {
      whereClauses.push(`r."tsICO" = $${paramIndex}`);
      params.push(ico);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`r."tsNazovUJ" ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (typ) {
      whereClauses.push(`r."tsTypZavierky" = $${paramIndex}`);
      params.push(typ);
      paramIndex++;
    }

    if (konsolidovana !== undefined) {
      whereClauses.push(`r."tsKonsolidovana" = $${paramIndex}`);
      params.push(konsolidovana);
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

    if (templateId !== undefined) {
      whereClauses.push(`r."idSablony" = $${paramIndex}`);
      params.push(templateId);
      paramIndex++;
    }

    if (entityType) {
      whereClauses.push(`r."tsTypUctovnejJednotky" ILIKE $${paramIndex}`);
      params.push(`%${entityType}%`);
      paramIndex++;
    }

    // Only include reports that have actual financial data (tabulky is not null/empty)
    whereClauses.push(`r.tabulky IS NOT NULL`);
    whereClauses.push(`r.tabulky::text != '{}'`);
    whereClauses.push(`r.tabulky::text != 'null'`);

    const whereClause = whereClauses.join(" AND ");

    // Count query
    const countSql = `
      SELECT COUNT(*) as count
      FROM "FinancialReport" r
      WHERE ${whereClause}
    `;
    const total = await queryCount(countSql, params);

    // Main query — don't fetch full tabulky JSONB (too large), just extract key values
    const selectSql = `
      SELECT
        r.id,
        r."idSablony",
        r."tsNazovUJ",
        r."tsICO",
        r."tsPravnaForma",
        r."tsSkNace",
        r."tsTypZavierky",
        r."tsKonsolidovana",
        r."tsTypUctovnejJednotky",
        r."tsObdobieOd",
        r."tsObdobieDo",
        r."tsPredchObdobieOd",
        r."tsPredchObdobieDo",
        r."datumPoslednejUpravy",
        r."idUctovnejZavierky",
        r.mena,
        t.nazov as sablona_nazov,
        -- Extract total assets: first element of first table's data array
        CASE
          WHEN jsonb_typeof(r.tabulky) = 'array' AND jsonb_array_length(r.tabulky) > 0
          THEN r.tabulky->0->'data'->>0
          ELSE NULL
        END as "totalAssets",
        -- Extract total liabilities: first element of second table's data array
        CASE
          WHEN jsonb_typeof(r.tabulky) = 'array' AND jsonb_array_length(r.tabulky) > 1
          THEN r.tabulky->1->'data'->>0
          ELSE NULL
        END as "totalLiabilities"
      FROM "FinancialReport" r
      LEFT JOIN "ReportTemplate" t ON r."idSablony" = t.id
      WHERE ${whereClause}
      ORDER BY r."${sortBy}" ${sortDir} NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const queryParams = [...params, limit, offset];
    const reports = await queryRows<any>(selectSql, queryParams);

    const totalPages = Math.ceil(total / limit);

    // Transform to frontend Statement type
    const data = reports.map((r: any) => {
      // Parse total assets and liabilities from JSONB extraction
      const totalAssets = parseFinancialValue(r.totalAssets);
      const totalLiabilities = parseFinancialValue(r.totalLiabilities);

      return {
        id: String(r.id),
        entity_id: r.tsICO || "",
        entity_name: r.tsNazovUJ || "",
        entity_ico: r.tsICO || "",
        statement_type: r.tsTypZavierky || "",
        period_from: r.tsObdobieOd || "",
        period_to: r.tsObdobieDo || "",
        consolidated: r.tsKonsolidovana || false,
        filing_date: r.datumPoslednejUpravy,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: null as number | null, // Could be computed
        net_income: null as number | null, // Requires VZZ table
        template_id: r.idSablony,
        template_name: getTemplateName(r.sablona_nazov),
        entity_type: r.tsTypUctovnejJednotky || "",
        legal_form: r.tsPravnaForma || "",
        nace_code: r.tsSkNace || "",
        currency: r.mena || "EUR",
        url: "",
      };
    });

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

/**
 * Parse a financial value from JSONB extraction.
 * Values come as strings like "46240746" or null.
 */
function parseFinancialValue(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "null") return null;
  const str = typeof val === "string" ? val.replace(/"/g, "") : String(val);
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

/**
 * Extract Slovak name from template nazov (JSONB with sk/en keys)
 */
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
  if (typeof nazov === "object") {
    return nazov.sk || nazov.en || "";
  }
  return String(nazov);
}
