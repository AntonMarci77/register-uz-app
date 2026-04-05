import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryRows, queryCount } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/line-items — Vráti riadkové dáta z účtovných výkazov s automatickými popiskami
 *
 * Automaticky rozbalí JSON tabulky výkazov a priradí im popisky
 * zo šablóny (ReportTemplate.tabulky).
 *
 * Query parametre:
 * - template_id: number (povinný) — ID šablóny
 * - table_index: number (default 0) — index tabuľky v šablóne (0=aktíva, 1=pasíva, 2=VZaS)
 * - row_numbers: string (voliteľný) — zoznam riadkov oddelených čiarkou (napr. "1,2,3")
 * - period_from: string — obdobie od (YYYY-MM)
 * - period_to: string — obdobie do (YYYY-MM)
 * - region: string — kraj
 * - district: string — okres
 * - legal_form: string — právna forma
 * - size: string — veľkosť organizácie
 * - nace_code: string — SK NACE
 * - page: number (default 1)
 * - limit: number (default 50, max 500)
 *
 * Odpoveď:
 * {
 *   template: { id, nazov, nariadenieMF },
 *   table: { name, rowDefinitions: [{oznacenie, cisloRiadku, text}] },
 *   data: [{
 *     reportId, statementId, entityId, ico, nazovUJ,
 *     obdobieOd, obdobieDo, mena,
 *     rows: [{row, label, oznacenie, value}]
 *   }],
 *   pagination: { page, limit, total, totalPages },
 *   stats: { rowStats: [{row, label, count, sum, avg, min, max, median}] }
 * }
 */

interface TableDefinition {
  nazov: Record<string, string> | string;
  hlavicka?: any[];
  riadky: Array<{
    oznacenie?: string;
    cisloRiadku: number;
    text: Record<string, string> | string;
  }>;
}

interface TableData {
  nazov: string | Record<string, string>;
  data: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Povinné parametre
    const templateId = searchParams.get("template_id");
    if (!templateId) {
      return NextResponse.json(
        { error: "Chýba parameter template_id" },
        { status: 400 }
      );
    }

    const templateIdNum = parseInt(templateId, 10);
    const tableIndex = parseInt(searchParams.get("table_index") || "0", 10);
    const rowNumbersStr = searchParams.get("row_numbers");
    const rowNumbers = rowNumbersStr
      ? rowNumbersStr.split(",").map((r) => parseInt(r.trim(), 10))
      : null;

    // Paginacia
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const skip = (page - 1) * limit;

    // Filtre na účtovnú jednotku
    const region = searchParams.get("region") || undefined;
    const district = searchParams.get("district") || undefined;
    const legalForm = searchParams.get("legal_form") || undefined;
    const size = searchParams.get("size") || undefined;
    const naceCode = searchParams.get("nace_code") || undefined;
    const periodFrom = searchParams.get("period_from") || undefined;
    const periodTo = searchParams.get("period_to") || undefined;

    // 1. Načítaj šablónu
    const template = await queryOne<{
      id: number;
      nazov: string;
      nariadenieMF: string | null;
      tabulky: string | any;
    }>(
      `SELECT id, nazov, "nariadenieMF", tabulky FROM "ReportTemplate" WHERE id = $1`,
      [templateIdNum]
    );

    if (!template) {
      return NextResponse.json(
        { error: `Šablóna s ID ${templateIdNum} nebola nájdená` },
        { status: 404 }
      );
    }

    // Parsuj definíciu tabuliek zo šablóny
    let templateTables: TableDefinition[] = [];
    if (template.tabulky) {
      try {
        templateTables =
          typeof template.tabulky === "string"
            ? JSON.parse(template.tabulky as string)
            : (template.tabulky as any);
      } catch {
        templateTables = [];
      }
    }

    if (tableIndex >= templateTables.length) {
      return NextResponse.json(
        {
          error: `Šablóna má len ${templateTables.length} tabuliek, index ${tableIndex} je mimo rozsah`,
          availableTables: templateTables.map((t, i) => ({
            index: i,
            name: typeof t.nazov === "string" ? t.nazov : t.nazov?.sk,
          })),
        },
        { status: 400 }
      );
    }

    const tableDef = templateTables[tableIndex];
    const tableName =
      typeof tableDef.nazov === "string"
        ? tableDef.nazov
        : tableDef.nazov?.sk || "Tabuľka";
    const rowDefs = tableDef.riadky || [];

    // 2. Build SQL WHERE clause and parameters for reports
    const params: any[] = [templateIdNum];
    let paramIndex = 2;

    // Base WHERE clause
    let whereClause = `WHERE fr."idSablony" = $1 AND fr.zmazany = false`;

    // Add entity filters if present
    if (region) {
      whereClause += ` AND e."krajKod" = $${paramIndex}`;
      params.push(region);
      paramIndex++;
    }
    if (district) {
      whereClause += ` AND e."okresKod" = $${paramIndex}`;
      params.push(district);
      paramIndex++;
    }
    if (legalForm) {
      whereClause += ` AND e."pravnaFormaKod" = $${paramIndex}`;
      params.push(legalForm);
      paramIndex++;
    }
    if (size) {
      whereClause += ` AND e."velkostOrganizacieKod" = $${paramIndex}`;
      params.push(size);
      paramIndex++;
    }
    if (naceCode) {
      whereClause += ` AND e."skNaceKod" = $${paramIndex}`;
      params.push(naceCode);
      paramIndex++;
    }

    // Add statement filters if present
    if (periodFrom) {
      whereClause += ` AND fs."obdobieOd" >= $${paramIndex}`;
      params.push(periodFrom);
      paramIndex++;
    }
    if (periodTo) {
      whereClause += ` AND fs."obdobieDo" <= $${paramIndex}`;
      params.push(periodTo);
      paramIndex++;
    }

    // Add deleted flags checks
    whereClause += ` AND fs.zmazana = false AND e.zmazpiznakana = false`;

    // 3. Count total and fetch reports
    const countQuery = `
      SELECT COUNT(*) as count
      FROM "FinancialReport" fr
      LEFT JOIN "FinancialStatement" fs ON fr."idUctovnejZavierky" = fs.id
      LEFT JOIN "AccountingEntity" e ON fs."idUJ" = e.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        fr.id,
        fr.tabulky,
        fr.mena,
        fr."tsNazovUJ",
        fr."tsICO",
        fr."tsObdobieOd",
        fr."tsObdobieDo",
        fr."idUctovnejZavierky",
        fs.id as "statementId",
        fs."obdobieOd" as "fsObdobieOd",
        fs."obdobieDo" as "fsObdobieDo",
        e.id as "entityId",
        e.ico as "entityIco",
        e."nazovUJ" as "entityNazov",
        e."krajKod",
        e."okresKod",
        e."pravnaFormaKod",
        e."velkostOrganizacieKod",
        e."skNaceKod"
      FROM "FinancialReport" fr
      LEFT JOIN "FinancialStatement" fs ON fr."idUctovnejZavierky" = fs.id
      LEFT JOIN "AccountingEntity" e ON fs."idUJ" = e.id
      ${whereClause}
      ORDER BY fr."datumPoslednejUpravy" DESC
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const [countResult, reports] = await Promise.all([
      queryOne<{ count: string }>(countQuery, params),
      queryRows<any>(dataQuery, [
        ...params,
        skip,
        limit,
      ]),
    ]);

    const total = parseInt(countResult?.count || "0", 10);

    // 4. Extract row data from JSON tables
    const allRowValues: Map<number, number[]> = new Map();
    const data = reports.map((report) => {
      let reportTables: TableData[] = [];
      if (report.tabulky) {
        try {
          reportTables =
            typeof report.tabulky === "string"
              ? JSON.parse(report.tabulky as string)
              : (report.tabulky as any);
        } catch {
          reportTables = [];
        }
      }

      const tableData = reportTables[tableIndex];
      const values = tableData?.data || [];

      // Map values to rows
      const rows = rowDefs
        .filter((rd) => !rowNumbers || rowNumbers.includes(rd.cisloRiadku))
        .map((rd, idx) => {
          const rawValue = values[idx] || null;
          const numValue = rawValue ? parseFloat(rawValue) : null;
          const label =
            typeof rd.text === "string" ? rd.text : rd.text?.sk || "";

          // Collect values for statistics
          if (numValue !== null && !isNaN(numValue)) {
            if (!allRowValues.has(rd.cisloRiadku)) {
              allRowValues.set(rd.cisloRiadku, []);
            }
            allRowValues.get(rd.cisloRiadku)!.push(numValue);
          }

          return {
            row: rd.cisloRiadku,
            oznacenie: rd.oznacenie || null,
            label,
            value: numValue,
            rawValue,
          };
        });

      return {
        reportId: report.id,
        statementId: report.idUctovnejZavierky,
        entityId: report.entityId || null,
        ico: report.tsICO || report.entityIco || null,
        nazovUJ: report.tsNazovUJ || report.entityNazov || null,
        obdobieOd:
          report.tsObdobieOd ||
          report.fsObdobieOd ||
          null,
        obdobieDo:
          report.tsObdobieDo ||
          report.fsObdobieDo ||
          null,
        mena: report.mena || "EUR",
        rows,
      };
    });

    // 5. Calculate statistics for each row
    const rowStats = rowDefs
      .filter((rd) => !rowNumbers || rowNumbers.includes(rd.cisloRiadku))
      .map((rd) => {
        const values = allRowValues.get(rd.cisloRiadku) || [];
        const label =
          typeof rd.text === "string" ? rd.text : rd.text?.sk || "";

        if (values.length === 0) {
          return {
            row: rd.cisloRiadku,
            oznacenie: rd.oznacenie || null,
            label,
            count: 0,
            sum: 0,
            avg: 0,
            min: 0,
            max: 0,
            median: 0,
            stddev: 0,
          };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const median =
          sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        const variance =
          values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
        const stddev = Math.sqrt(variance);

        return {
          row: rd.cisloRiadku,
          oznacenie: rd.oznacenie || null,
          label,
          count: values.length,
          sum: Math.round(sum * 100) / 100,
          avg: Math.round(avg * 100) / 100,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          median: Math.round(median * 100) / 100,
          stddev: Math.round(stddev * 100) / 100,
        };
      });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      template: {
        id: template.id,
        nazov: template.nazov,
        nariadenieMF: template.nariadenieMF,
      },
      table: {
        index: tableIndex,
        name: tableName,
        rowDefinitions: rowDefs.map((rd) => ({
          oznacenie: rd.oznacenie || null,
          cisloRiadku: rd.cisloRiadku,
          text: typeof rd.text === "string" ? rd.text : rd.text?.sk || "",
        })),
      },
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        rowStats,
        totalReports: total,
      },
    });
  } catch (error) {
    console.error("Error fetching line items:", error);
    return NextResponse.json(
      {
        error: "Chyba pri načítaní riadkových dát",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
