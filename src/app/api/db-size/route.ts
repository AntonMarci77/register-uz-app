import { NextResponse } from "next/server";
import { queryRows, queryOne } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/db-size - Database size overview
 */
export async function GET() {
  try {
    const [totalSize, tableSizes, counts, sampleEntities, fieldStats, reportStats] = await Promise.all([
      queryOne<{ total_size: string }>(
        "SELECT pg_size_pretty(pg_database_size(current_database())) as total_size"
      ),
      queryRows(`
        SELECT
          tablename as table,
          pg_size_pretty(pg_total_relation_size('public.' || quote_ident(tablename))) as size,
          pg_total_relation_size('public.' || quote_ident(tablename)) as raw_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY raw_bytes DESC
      `),
      queryOne(`
        SELECT
          (SELECT COUNT(*) FROM "AccountingEntity") as entities,
          (SELECT COUNT(*) FROM "FinancialStatement") as statements,
          (SELECT COUNT(*) FROM "FinancialReport") as reports,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'ReportLineItem' AND table_schema = 'public') as "lineItemTableExists",
          (SELECT COUNT(*) FROM "ReportTemplate") as templates,
          (SELECT COUNT(*) FROM "Kraj") as kraje,
          (SELECT COUNT(*) FROM "PravnaForma") as pravne_formy,
          (SELECT COUNT(*) FROM "SkNace") as sk_nace
      `),
      queryRows(`
        SELECT "pravnaFormaKod", "skNaceKod", "velkostOrganizacieKod", "krajKod", "okresKod"
        FROM "AccountingEntity"
        WHERE "pravnaFormaKod" IS NOT NULL OR "skNaceKod" IS NOT NULL OR "velkostOrganizacieKod" IS NOT NULL
        LIMIT 5
      `),
      queryOne(`
        SELECT
          COUNT(*) FILTER (WHERE "pravnaFormaKod" IS NOT NULL AND "pravnaFormaKod" != '') as with_legal_form,
          COUNT(*) FILTER (WHERE "skNaceKod" IS NOT NULL AND "skNaceKod" != '') as with_nace,
          COUNT(*) FILTER (WHERE "velkostOrganizacieKod" IS NOT NULL AND "velkostOrganizacieKod" != '') as with_size,
          COUNT(*) FILTER (WHERE "krajKod" IS NOT NULL AND "krajKod" != '') as with_region,
          COUNT(*) as total
        FROM "AccountingEntity"
      `),
      queryOne(`
        SELECT
          COUNT(*) as total_reports,
          COUNT(*) FILTER (WHERE tabulky IS NOT NULL) as with_tabulky,
          COUNT(*) FILTER (WHERE tabulky IS NOT NULL AND tabulky::text != '{}' AND tabulky::text != 'null' AND tabulky::text != '[]') as with_tabulky_data,
          COUNT(*) FILTER (WHERE "tsNazovUJ" IS NOT NULL AND "tsNazovUJ" != '') as with_name,
          COUNT(*) FILTER (WHERE "tsICO" IS NOT NULL AND "tsICO" != '') as with_ico,
          COUNT(*) FILTER (WHERE "tsTypZavierky" IS NOT NULL) as with_type,
          COUNT(*) FILTER (WHERE zmazany = false) as not_deleted
        FROM "FinancialReport"
      `),
    ]);

    return NextResponse.json({
      database: { total_size: totalSize?.total_size },
      tables: tableSizes.map((r: any) => ({
        table: r.table,
        size: r.size,
        bytes: parseInt(r.raw_bytes),
      })),
      row_counts: counts,
      entity_field_stats: fieldStats,
      report_stats: reportStats,
      sample_entities_with_codes: sampleEntities,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
