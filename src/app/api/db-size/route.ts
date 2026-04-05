import { NextResponse } from "next/server";
import { queryRows, queryOne } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/db-size - Database size overview
 */
export async function GET() {
  try {
    const [totalSize, tableSizes, counts] = await Promise.all([
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
    ]);

    return NextResponse.json({
      database: { total_size: totalSize?.total_size },
      tables: tableSizes.map((r: any) => ({
        table: r.table,
        size: r.size,
        bytes: parseInt(r.raw_bytes),
      })),
      row_counts: counts,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
