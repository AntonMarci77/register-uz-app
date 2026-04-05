import { NextRequest, NextResponse } from "next/server";
import { queryRows, queryCount, buildWhere, getNazovSK } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/entities - Get accounting entities with filtering, searching, and pagination
 *
 * Query Parameters (accepts both frontend and DB-style names):
 * - page, limit, sortBy, sortDir
 * - search/nazov - Search by entity name
 * - region/kraj - Filter by region code
 * - district/okres - Filter by district code
 * - legal_form/pravnaForma - Filter by legal form code
 * - nace_code/skNace - Filter by SK NACE code
 * - size/velkostOrganizacie - Filter by organization size code
 * - ico - Filter by IČO
 */

type SortField = "nazovUJ" | "ico" | "datumPoslednejUpravy" | "datumZalozenia";

interface EntityResult {
  id: string;
  ico: string;
  dic: string;
  nazovUJ: string;
  mesto: string;
  psc: string;
  datumZalozenia: Date;
  datumZrusenia: Date | null;
  konsolidovana: boolean;
  datumPoslednejUpravy: Date;
  pravnaForma_kod: string | null;
  pravnaForma_nazov: any;
  skNace_kod: string | null;
  skNace_nazov: any;
  velkostOrganizacie_kod: string | null;
  velkostOrganizacie_nazov: any;
  kraj_kod: string | null;
  kraj_nazov: any;
  okres_kod: string | null;
  okres_nazov: any;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Filters (accept both frontend and DB-style parameter names)
    const ico = searchParams.get("ico") || undefined;
    const nazov = searchParams.get("search") || searchParams.get("nazov") || undefined;
    const kraj = searchParams.get("region") || searchParams.get("kraj") || undefined;
    const okres = searchParams.get("district") || searchParams.get("okres") || undefined;
    const pravnaForma = searchParams.get("legal_form") || searchParams.get("pravnaForma") || undefined;
    const skNace = searchParams.get("nace_code") || searchParams.get("skNace") || undefined;
    const velkostOrganizacie = searchParams.get("size") || searchParams.get("velkostOrganizacie") || undefined;

    // Sorting
    const sortByParam = searchParams.get("sortBy") || "nazovUJ";
    const sortDirParam = (searchParams.get("sortDir") || "asc").toLowerCase();

    const sortBy = validateSortField(sortByParam) ? (sortByParam as SortField) : ("nazovUJ" as SortField);
    const sortDir = sortDirParam === "desc" ? ("desc" as const) : ("asc" as const);

    // Build WHERE clause using helper
    const whereResult = buildWhere(
      [
        { field: 'e.zmazpiznakana', op: '=', value: false },
        ico ? { field: 'e.ico', op: 'ILIKE', value: ico } : null,
        nazov ? { field: 'e."nazovUJ"', op: 'ILIKE', value: nazov } : null,
        kraj ? { field: 'e."krajKod"', op: '=', value: kraj } : null,
        okres ? { field: 'e."okresKod"', op: '=', value: okres } : null,
        pravnaForma ? { field: 'e."pravnaFormaKod"', op: '=', value: pravnaForma } : null,
        skNace ? { field: 'e."skNaceKod"', op: '=', value: skNace } : null,
        velkostOrganizacie ? { field: 'e."velkostOrganizacieKod"', op: '=', value: velkostOrganizacie } : null,
      ],
      1
    );

    const whereClause = whereResult.clause ? `WHERE ${whereResult.clause.substring(4)}` : "WHERE e.zmazpiznakana = false";
    const whereParams = whereResult.params.length > 0 ? whereResult.params : [false];

    // Build ORDER BY clause with validation
    const orderClause = `ORDER BY e."${sortBy}" ${sortDir.toUpperCase()}`;

    // Base SQL query with JOINs
    const baseSql = `
      SELECT
        e.id,
        e.ico,
        e.dic,
        e."nazovUJ",
        e.mesto,
        e.psc,
        e."datumZalozenia",
        e."datumZrusenia",
        e.konsolidovana,
        e."datumPoslednejUpravy",
        pf.kod AS "pravnaForma_kod",
        pf.nazov AS "pravnaForma_nazov",
        sn.kod AS "skNace_kod",
        sn.nazov AS "skNace_nazov",
        vo.kod AS "velkostOrganizacie_kod",
        vo.nazov AS "velkostOrganizacie_nazov",
        k.kod AS "kraj_kod",
        k.nazov AS "kraj_nazov",
        o.kod AS "okres_kod",
        o.nazov AS "okres_nazov"
      FROM "AccountingEntity" e
      LEFT JOIN "PravnaForma" pf ON e."pravnaFormaKod" = pf.kod
      LEFT JOIN "SkNace" sn ON e."skNaceKod" = sn.kod
      LEFT JOIN "VelkostOrganizacie" vo ON e."velkostOrganizacieKod" = vo.kod
      LEFT JOIN "Kraj" k ON e."krajKod" = k.kod
      LEFT JOIN "Okres" o ON e."okresKod" = o.kod
      ${whereClause}
      ${orderClause}
      LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*) as count
      FROM "AccountingEntity" e
      ${whereClause}
    `;

    // Execute queries with parameterized queries
    const [rawEntities, totalCount] = await Promise.all([
      queryRows<EntityResult>(baseSql, [...whereParams, limit, skip]),
      queryCount(countSql, whereParams),
    ]);

    // Transform raw database results to match frontend Entity type
    const entities = rawEntities.map((row) => ({
      id: String(row.id),
      name: row.nazovUJ || "",
      ico: row.ico || "",
      dic: row.dic || "",
      legal_form: row.pravnaForma_kod
        ? getNazovSK(row.pravnaForma_nazov) || row.pravnaForma_kod
        : "",
      region: row.kraj_kod
        ? getNazovSK(row.kraj_nazov) || row.kraj_kod
        : "",
      district: row.okres_kod
        ? getNazovSK(row.okres_nazov) || row.okres_kod
        : "",
      municipality: row.mesto || "",
      size: row.velkostOrganizacie_kod
        ? getNazovSK(row.velkostOrganizacie_nazov) || row.velkostOrganizacie_kod
        : "",
      nace_code: row.skNace_kod
        ? `${row.skNace_kod} - ${getNazovSK(row.skNace_nazov) || ""}`
        : "",
      nace_description: row.skNace_kod ? getNazovSK(row.skNace_nazov) || "" : "",
      created_at: row.datumZalozenia ? String(row.datumZalozenia) : "",
      psc: row.psc || "",
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        data: entities,
        total: totalCount,
        page,
        limit,
        pages: totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching entities:", error);
    return NextResponse.json(
      { error: "Failed to fetch entities", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function validateSortField(field: string): boolean {
  const validFields: SortField[] = ["nazovUJ", "ico", "datumPoslednejUpravy", "datumZalozenia"];
  return validFields.includes(field as SortField);
}
