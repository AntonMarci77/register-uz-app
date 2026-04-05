import { NextRequest, NextResponse } from "next/server";
import { queryRows, queryCount, buildWhere } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/entities - Get accounting entities with filtering, searching, and pagination
 *
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 20, max: 100) - Items per page
 * - ico: string - Filter by IČO (company registration number)
 * - nazov: string - Search by entity name (case-insensitive partial match)
 * - kraj: string - Filter by region code
 * - okres: string - Filter by district code
 * - pravnaForma: string - Filter by legal form code
 * - skNace: string - Filter by SK NACE classification code
 * - velkostOrganizacie: string - Filter by organization size code
 * - sortBy: string (default: "nazovUJ") - Field to sort by (nazovUJ, ico, datumPoslednejUpravy)
 * - sortDir: "asc" | "desc" (default: "asc") - Sort direction
 */

type SortField = "nazovUJ" | "ico" | "datumPoslednejUpravy" | "datumZalozenia";
type SortDirection = "asc" | "desc";

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
  pravnaForma_nazov: string | null;
  skNace_kod: string | null;
  skNace_nazov: string | null;
  velkostOrganizacie_kod: string | null;
  velkostOrganizacie_nazov: string | null;
  kraj_kod: string | null;
  kraj_nazov: string | null;
  okres_kod: string | null;
  okres_nazov: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Filters
    const ico = searchParams.get("ico") || undefined;
    const nazov = searchParams.get("nazov") || undefined;
    const kraj = searchParams.get("kraj") || undefined;
    const okres = searchParams.get("okres") || undefined;
    const pravnaForma = searchParams.get("pravnaForma") || undefined;
    const skNace = searchParams.get("skNace") || undefined;
    const velkostOrganizacie = searchParams.get("velkostOrganizacie") || undefined;

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
        pf.kod AS pravnaForma_kod,
        pf.nazov AS pravnaForma_nazov,
        sn.kod AS skNace_kod,
        sn.nazov AS skNace_nazov,
        vo.kod AS velkostOrganizacie_kod,
        vo.nazov AS velkostOrganizacie_nazov,
        k.kod AS kraj_kod,
        k.nazov AS kraj_nazov,
        o.kod AS okres_kod,
        o.nazov AS okres_nazov
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

    // Transform raw database results to match original response format
    const entities = rawEntities.map((row) => ({
      id: row.id,
      ico: row.ico,
      dic: row.dic,
      nazovUJ: row.nazovUJ,
      mesto: row.mesto,
      psc: row.psc,
      datumZalozenia: row.datumZalozenia,
      datumZrusenia: row.datumZrusenia,
      konsolidovana: row.konsolidovana,
      datumPoslednejUpravy: row.datumPoslednejUpravy,
      pravnaForma: row.pravnaForma_kod
        ? { kod: row.pravnaForma_kod, nazov: row.pravnaForma_nazov }
        : null,
      skNace: row.skNace_kod ? { kod: row.skNace_kod, nazov: row.skNace_nazov } : null,
      velkostOrganizacie: row.velkostOrganizacie_kod
        ? { kod: row.velkostOrganizacie_kod, nazov: row.velkostOrganizacie_nazov }
        : null,
      kraj: row.kraj_kod ? { kod: row.kraj_kod, nazov: row.kraj_nazov } : null,
      okres: row.okres_kod ? { kod: row.okres_kod, nazov: row.okres_nazov } : null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        data: entities,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
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
