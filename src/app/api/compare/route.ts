import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@/lib/db-raw";
import {
  ALL_MAPPINGS,
  TEMPLATE_MICRO_ID,
  TEMPLATE_POD_ID,
  TEMPLATE_INFO,
  type RowMapping,
  type TableType,
} from "@/lib/template-mapping";

export const dynamic = "force-dynamic";

/**
 * GET /api/compare — Porovnanie dát medzi mikro a malými/veľkými ÚJ
 *
 * Používa mapovanie z template-mapping.ts na porovnanie agregovaných
 * štatistík medzi šablónami Úč MUJ (687) a Úč POD (699).
 *
 * Query parametre:
 * - table: "aktiva" | "pasiva" | "vzas" (default "aktiva")
 * - level: number (min úroveň hierarchie, default 0 = všetko)
 * - period_from: string — obdobie od
 * - period_to: string — obdobie do
 * - region, district, legal_form, nace_code — filtre
 *
 * Odpoveď obsahuje štatistiky (avg, median, count, sum) pre každý
 * mapovaný riadok z oboch šablón.
 */

interface TableData {
  nazov: string | Record<string, string>;
  data: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const table = (searchParams.get("table") || "aktiva") as TableType;
    const minLevel = parseInt(searchParams.get("level") || "0", 10);
    const periodFrom = searchParams.get("period_from") || undefined;
    const periodTo = searchParams.get("period_to") || undefined;
    const region = searchParams.get("region") || undefined;
    const district = searchParams.get("district") || undefined;
    const legalForm = searchParams.get("legal_form") || undefined;
    const naceCode = searchParams.get("nace_code") || undefined;

    // Filtruj mapovania podľa tabuľky a úrovne
    const mappings = ALL_MAPPINGS.filter(
      (m) => m.table === table && m.level >= minLevel
    );

    // Zostavenie raw SQL dotazu
    const buildReportsSQL = (templateId: number): { sql: string; params: (string | number)[] } => {
      const params: (string | number)[] = [templateId];
      let paramIndex = 2;

      let sql = `
        SELECT fr.id, fr.tabulky
        FROM "FinancialReport" fr
        JOIN "FinancialStatement" fs ON fr."idUctovnejZavierky" = fs.id
        JOIN "AccountingEntity" e ON fs."idUJ" = e.id
        WHERE fr."idSablony" = $1 AND fr.zmazany = false AND fs.zmazana = false AND e.zmazpiznakana = false
      `;

      if (region) {
        sql += ` AND e."krajKod" = $${paramIndex}`;
        params.push(region);
        paramIndex++;
      }

      if (district) {
        sql += ` AND e."okresKod" = $${paramIndex}`;
        params.push(district);
        paramIndex++;
      }

      if (legalForm) {
        sql += ` AND e."pravnaFormaKod" = $${paramIndex}`;
        params.push(legalForm);
        paramIndex++;
      }

      if (naceCode) {
        sql += ` AND e."skNaceKod" = $${paramIndex}`;
        params.push(naceCode);
        paramIndex++;
      }

      if (periodFrom) {
        sql += ` AND fs."obdobieOd" >= $${paramIndex}`;
        params.push(periodFrom);
        paramIndex++;
      }

      if (periodTo) {
        sql += ` AND fs."obdobieDo" <= $${paramIndex}`;
        params.push(periodTo);
        paramIndex++;
      }

      sql += ` LIMIT 10000`;

      return { sql, params };
    };

    // Načítaj výkazy pre obe šablóny (len tabulky, nie celé záznamy)
    const [microReports, podReports] = await Promise.all([
      (async () => {
        const { sql, params } = buildReportsSQL(TEMPLATE_MICRO_ID);
        const rows = await queryRows(sql, params);
        return rows.map((row: any) => ({ id: row.id, tabulky: row.tabulky }));
      })(),
      (async () => {
        const { sql, params } = buildReportsSQL(TEMPLATE_POD_ID);
        const rows = await queryRows(sql, params);
        return rows.map((row: any) => ({ id: row.id, tabulky: row.tabulky }));
      })(),
    ]);

    // Šablóny pre zistenie indexu tabuľky
    const microInfo = TEMPLATE_INFO[TEMPLATE_MICRO_ID];
    const podInfo = TEMPLATE_INFO[TEMPLATE_POD_ID];
    const microTableIndex =
      microInfo?.tables.find((t) => t.type === table)?.tableIndex ?? 0;
    const podTableIndex =
      podInfo?.tables.find((t) => t.type === table)?.tableIndex ?? 0;

    // Extrahuj hodnoty pre každý mapovací riadok
    const extractValues = (
      reports: typeof microReports,
      tableIdx: number,
      rows: number[]
    ): number[] => {
      const values: number[] = [];
      for (const report of reports) {
        let tables: TableData[] = [];
        try {
          tables =
            typeof report.tabulky === "string"
              ? JSON.parse(report.tabulky as string)
              : (report.tabulky as any) || [];
        } catch {
          continue;
        }

        const tableData = tables[tableIdx];
        if (!tableData?.data) continue;

        // Sčítaj hodnoty z požadovaných riadkov
        let sum = 0;
        let hasValue = false;
        for (const rowNum of rows) {
          // Riadky sú 1-indexed, data pole je 0-indexed
          const val = parseFloat(tableData.data[rowNum - 1]);
          if (!isNaN(val)) {
            sum += val;
            hasValue = true;
          }
        }
        if (hasValue) {
          values.push(sum);
        }
      }
      return values;
    };

    const computeStats = (values: number[]) => {
      if (values.length === 0) {
        return { count: 0, sum: 0, avg: 0, min: 0, max: 0, median: 0, stddev: 0, q1: 0, q3: 0 };
      }
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const median =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const variance =
        values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
      const stddev = Math.sqrt(variance);

      return {
        count: values.length,
        sum: Math.round(sum * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median: Math.round(median * 100) / 100,
        stddev: Math.round(stddev * 100) / 100,
        q1: Math.round((q1 || 0) * 100) / 100,
        q3: Math.round((q3 || 0) * 100) / 100,
      };
    };

    // Porovnanie pre každý mapovací riadok
    const comparison = mappings.map((mapping) => {
      const microStats = mapping.microRow
        ? computeStats(
            extractValues(microReports, microTableIndex, [mapping.microRow])
          )
        : null;

      const podStats = mapping.podRows
        ? computeStats(
            extractValues(podReports, podTableIndex, mapping.podRows)
          )
        : null;

      return {
        mappingId: mapping.mappingId,
        label: mapping.label,
        level: mapping.level,
        microRow: mapping.microRow,
        podRows: mapping.podRows,
        micro: microStats,
        pod: podStats,
      };
    });

    return NextResponse.json({
      table,
      templates: {
        micro: {
          id: TEMPLATE_MICRO_ID,
          name: microInfo?.shortName || "Úč MUJ (Mikro)",
          reportCount: microReports.length,
        },
        pod: {
          id: TEMPLATE_POD_ID,
          name: podInfo?.shortName || "Úč POD (Malé/Veľké)",
          reportCount: podReports.length,
        },
      },
      comparison,
    });
  } catch (error) {
    console.error("Error comparing templates:", error);
    return NextResponse.json(
      {
        error: "Chyba pri porovnávaní šablón",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
