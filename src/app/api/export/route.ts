import { NextRequest, NextResponse } from "next/server";
import { queryRows, getNazovSK } from "@/lib/db-raw";

/**
 * GET /api/export - Export filtered data as CSV
 *
 * Query Parameters:
 * - format: "csv" (only supported format)
 * - type: "entities" | "statements" | "reports" (data type to export)
 * - Additional filter params same as /api/entities and /api/statements
 *
 * Entity filters: ico, nazov, kraj, okres, pravnaForma, skNace, velkostOrganizacie
 * Statement filters: idUJ, typ, konsolidovana, obdobieOd, obdobieDo
 *
 * Returns: CSV file as download with proper headers
 */

export const dynamic = "force-dynamic";

type ExportType = "entities" | "statements" | "reports";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const format = searchParams.get("format") || "csv";
    const type = (searchParams.get("type") || "entities").toLowerCase() as ExportType;

    if (format !== "csv") {
      return NextResponse.json(
        { error: "Only CSV format is supported" },
        { status: 400 }
      );
    }

    if (!isValidExportType(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be one of: entities, statements, reports" },
        { status: 400 }
      );
    }

    let csvContent: string;
    let filename: string;

    if (type === "entities") {
      csvContent = await exportEntities(searchParams);
      filename = `entities-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (type === "statements") {
      csvContent = await exportStatements(searchParams);
      filename = `statements-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      csvContent = await exportReports(searchParams);
      filename = `reports-${new Date().toISOString().split("T")[0]}.csv`;
    }

    // Add BOM prefix for proper UTF-8 handling in Excel
    const csvWithBOM = "\uFEFF" + csvContent;

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(csvWithBOM, "utf-8").toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function exportEntities(params: URLSearchParams): Promise<string> {
  // Build base SQL query with joins
  let sql = `
    SELECT e.id, e.ico, e.dic, e."nazovUJ", e.mesto, e.ulica, e.psc,
      e."datumZalozenia", e."datumZrusenia", e.konsolidovana, e."datumPoslednejUpravy",
      pf.nazov as "pravnaFormaNazov", sn.nazov as "skNaceNazov",
      vo.nazov as "velkostNazov", k.nazov as "krajNazov", o.nazov as "okresNazov"
    FROM "AccountingEntity" e
    LEFT JOIN "PravnaForma" pf ON e."pravnaFormaKod" = pf.kod
    LEFT JOIN "SkNace" sn ON e."skNaceKod" = sn.kod
    LEFT JOIN "VelkostOrganizacie" vo ON e."velkostOrganizacieKod" = vo.kod
    LEFT JOIN "Kraj" k ON e."krajKod" = k.kod
    LEFT JOIN "Okres" o ON e."okresKod" = o.kod
    WHERE e.zmazpiznakana = false
  `;

  // Build dynamic filter conditions
  const filters: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.get("ico")) {
    filters.push(`e.ico ILIKE $${paramIndex}`);
    values.push(`%${params.get("ico")}%`);
    paramIndex++;
  }
  if (params.get("nazov")) {
    filters.push(`e."nazovUJ" ILIKE $${paramIndex}`);
    values.push(`%${params.get("nazov")}%`);
    paramIndex++;
  }
  if (params.get("kraj")) {
    filters.push(`e."krajKod" = $${paramIndex}`);
    values.push(params.get("kraj"));
    paramIndex++;
  }
  if (params.get("okres")) {
    filters.push(`e."okresKod" = $${paramIndex}`);
    values.push(params.get("okres"));
    paramIndex++;
  }
  if (params.get("pravnaForma")) {
    filters.push(`e."pravnaFormaKod" = $${paramIndex}`);
    values.push(params.get("pravnaForma"));
    paramIndex++;
  }
  if (params.get("skNace")) {
    filters.push(`e."skNaceKod" = $${paramIndex}`);
    values.push(params.get("skNace"));
    paramIndex++;
  }
  if (params.get("velkostOrganizacie")) {
    filters.push(`e."velkostOrganizacieKod" = $${paramIndex}`);
    values.push(params.get("velkostOrganizacie"));
    paramIndex++;
  }

  if (filters.length > 0) {
    sql += " AND " + filters.join(" AND ");
  }

  sql += " ORDER BY e.\"datumPoslednejUpravy\" DESC";

  const entities = await queryRows(sql, values);

  // CSV Headers
  const headers = [
    "ID",
    "IČO",
    "DIČ",
    "Názov",
    "Mestnosť",
    "Ulica",
    "PSČ",
    "Dátum založenia",
    "Dátum zrušenia",
    "Konsolidovaná",
    "Právna forma",
    "SK NACE",
    "Veľkosť organizácie",
    "Kraj",
    "Okres",
    "Posledná úprava",
  ];

  const rows = entities.map((e: any) => [
    String(e.id),
    e.ico || "",
    e.dic || "",
    e.nazovUJ || "",
    e.mesto || "",
    e.ulica || "",
    e.psc || "",
    e.datumZalozenia ? formatDate(e.datumZalozenia) : "",
    e.datumZrusenia ? formatDate(e.datumZrusenia) : "",
    e.konsolidovana ? "Áno" : "Nie",
    getNazovSK(e.pravnaFormaNazov) || "",
    getNazovSK(e.skNaceNazov) || "",
    getNazovSK(e.velkostNazov) || "",
    getNazovSK(e.krajNazov) || "",
    getNazovSK(e.okresNazov) || "",
    e.datumPoslednejUpravy ? formatDate(e.datumPoslednejUpravy) : "",
  ]);

  return createCSV(headers, rows);
}

async function exportStatements(params: URLSearchParams): Promise<string> {
  // Build base SQL query with joins
  let sql = `
    SELECT fs.id, fs."idUJ", e.ico, e."nazovUJ",
      fs."obdobieOd", fs."obdobieDo", fs.typ, fs.konsolidovana,
      fs."datumPodania", fs."datumZostavenia", fs."datumSchvalenia",
      fs."datumPoslednejUpravy",
      (SELECT COUNT(*) FROM "FinancialReport" WHERE "idUctovnejZavierky" = fs.id) as "pocetVykazov"
    FROM "FinancialStatement" fs
    JOIN "AccountingEntity" e ON fs."idUJ" = e.id
    WHERE fs.zmazana = false
  `;

  // Build dynamic filter conditions
  const filters: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.get("idUJ")) {
    filters.push(`fs."idUJ" = $${paramIndex}`);
    values.push(parseInt(params.get("idUJ")!, 10));
    paramIndex++;
  }
  if (params.get("typ")) {
    filters.push(`fs.typ = $${paramIndex}`);
    values.push(params.get("typ"));
    paramIndex++;
  }
  const konsolidovanaParam = params.get("konsolidovana");
  if (konsolidovanaParam !== null) {
    filters.push(`fs.konsolidovana = $${paramIndex}`);
    values.push(konsolidovanaParam.toLowerCase() === "true");
    paramIndex++;
  }
  if (params.get("obdobieOd")) {
    filters.push(`fs."obdobieOd" >= $${paramIndex}`);
    values.push(params.get("obdobieOd"));
    paramIndex++;
  }
  if (params.get("obdobieDo")) {
    filters.push(`fs."obdobieDo" <= $${paramIndex}`);
    values.push(params.get("obdobieDo"));
    paramIndex++;
  }
  const templateId = params.get("template_id");
  if (templateId) {
    filters.push(
      `fs.id IN (SELECT "idUctovnejZavierky" FROM "FinancialReport" fr JOIN "ReportLineItem" rli ON fr.id = rli."financialReportId" WHERE fr."idSablony" = $${paramIndex})`
    );
    values.push(parseInt(templateId, 10));
    paramIndex++;
  }

  if (filters.length > 0) {
    sql += " AND " + filters.join(" AND ");
  }

  sql += " ORDER BY fs.\"datumPoslednejUpravy\" DESC";

  const statements = await queryRows(sql, values);

  // CSV Headers
  const headers = [
    "ID Závierky",
    "ID Jednotky",
    "IČO",
    "Názov jednotky",
    "Obdobie od",
    "Obdobie do",
    "Typ závierky",
    "Konsolidovaná",
    "Dátum podania",
    "Dátum zostavenia",
    "Dátum schválenia",
    "Počet výkazov",
    "Posledná úprava",
  ];

  const rows = statements.map((s: any) => [
    String(s.id),
    String(s.idUJ),
    s.ico || "",
    s.nazovUJ || "",
    s.obdobieOd || "",
    s.obdobieDo || "",
    s.typ || "",
    s.konsolidovana ? "Áno" : "Nie",
    s.datumPodania ? formatDate(s.datumPodania) : "",
    s.datumZostavenia ? formatDate(s.datumZostavenia) : "",
    s.datumSchvalenia ? formatDate(s.datumSchvalenia) : "",
    String(s.pocetVykazov || 0),
    s.datumPoslednejUpravy ? formatDate(s.datumPoslednejUpravy) : "",
  ]);

  return createCSV(headers, rows);
}

async function exportReports(params: URLSearchParams): Promise<string> {
  const sql = `
    SELECT fr.id, fr."idUctovnejZavierky", fr."tsNazovUJ", fr."tsICO",
      fr."tsPravnaForma", fr."tsSkNace", fr."tsTypZavierky",
      fr."tsObdobieOd", fr."tsObdobieDo", fr.mena, fr."pristupnostDat",
      fr."datumPoslednejUpravy",
      (SELECT COUNT(*) FROM "ReportLineItem" WHERE "financialReportId" = fr.id) as "pocetPoloziek"
    FROM "FinancialReport" fr
    WHERE fr.zmazany = false
    ORDER BY fr."datumPoslednejUpravy" DESC
    LIMIT 10000
  `;

  const reports = await queryRows(sql, []);

  // CSV Headers
  const headers = [
    "ID Výkazu",
    "ID Závierky",
    "Názov jednotky",
    "IČO",
    "Právna forma",
    "SK NACE",
    "Typ závierky",
    "Obdobie od",
    "Obdobie do",
    "Mena",
    "Dostupnosť dát",
    "Počet položiek",
    "Posledná úprava",
  ];

  const rows = reports.map((r: any) => [
    String(r.id),
    r.idUctovnejZavierky ? String(r.idUctovnejZavierky) : "",
    r.tsNazovUJ || "",
    r.tsICO || "",
    r.tsPravnaForma || "",
    r.tsSkNace || "",
    r.tsTypZavierky || "",
    r.tsObdobieOd || "",
    r.tsObdobieDo || "",
    r.mena || "",
    r.pristupnostDat || "",
    String(r.pocetPoloziek || 0),
    r.datumPoslednejUpravy ? formatDate(r.datumPoslednejUpravy) : "",
  ]);

  return createCSV(headers, rows);
}

/**
 * Create CSV string from headers and rows
 * Properly escapes values and handles commas
 */
function createCSV(headers: string[], rows: string[][]): string {
  const escapedHeaders = headers.map(escapeCSVValue).join(",");
  const escapedRows = rows.map((row) => row.map(escapeCSVValue).join(",")).join("\n");

  return `${escapedHeaders}\n${escapedRows}`;
}

/**
 * Escape CSV values with quotes if needed
 */
function escapeCSVValue(value: string): string {
  if (!value) return '""';

  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}


function isValidExportType(type: string): type is ExportType {
  const valid: ExportType[] = ["entities", "statements", "reports"];
  return valid.includes(type as ExportType);
}
