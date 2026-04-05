import { NextRequest, NextResponse } from "next/server";
import { backfillReportContent } from "@/lib/sync";
import { queryOne } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync/backfill - Backfill report content (obsah) from RÚZ API
 *
 * Fetches financial reports that have NULL tsNazovUJ (proxy for missing content)
 * and re-downloads them from the API to populate titulná strana + tabuľky fields.
 *
 * Query Parameters:
 * - batch: Number of reports per run (default 500, max 5000)
 * - concurrency: Parallel API requests (default 30, max 50)
 *
 * GET /api/sync/backfill - Check backfill status and progress
 */

let isBackfilling = false;
let backfillProgress = { processed: 0, updated: 0, total: 0 };
let lastBackfillResult: {
  processed: number;
  updated: number;
  failed: number;
  remaining: number;
  timestamp: string;
} | null = null;

export async function POST(request: NextRequest) {
  if (isBackfilling) {
    return NextResponse.json(
      {
        status: "running",
        progress: backfillProgress,
        message: "Backfill is already in progress",
      },
      { status: 200 }
    );
  }

  const batch = Math.min(
    5000,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("batch") || "500", 10))
  );
  const concurrency = Math.min(
    50,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("concurrency") || "30", 10))
  );

  isBackfilling = true;
  backfillProgress = { processed: 0, updated: 0, total: 0 };

  // Run in background
  backfillReportContent(batch, concurrency, (processed, updated, total) => {
    backfillProgress = { processed, updated, total };
  })
    .then((result) => {
      lastBackfillResult = { ...result, timestamp: new Date().toISOString() };
      isBackfilling = false;
      console.log("[BACKFILL API] Completed:", result);
    })
    .catch((err) => {
      console.error("[BACKFILL API] Error:", err);
      isBackfilling = false;
      lastBackfillResult = {
        processed: backfillProgress.processed,
        updated: backfillProgress.updated,
        failed: 0,
        remaining: -1,
        timestamp: new Date().toISOString(),
      };
    });

  return NextResponse.json(
    {
      status: "started",
      batch,
      concurrency,
      message: `Backfill started for up to ${batch} reports with concurrency ${concurrency}`,
    },
    { status: 202 }
  );
}

export async function GET() {
  try {
    // Count reports with and without content
    const stats = await queryOne<{
      total: string;
      with_content: string;
      without_content: string;
      with_tabulky: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE zmazany = false) as total,
        COUNT(*) FILTER (WHERE zmazany = false AND "tsNazovUJ" IS NOT NULL AND "tsNazovUJ" != '') as with_content,
        COUNT(*) FILTER (WHERE zmazany = false AND ("tsNazovUJ" IS NULL OR "tsNazovUJ" = '')) as without_content,
        COUNT(*) FILTER (WHERE zmazany = false AND tabulky IS NOT NULL AND tabulky::text != 'null' AND tabulky::text != '[]') as with_tabulky
      FROM "FinancialReport"
    `);

    return NextResponse.json({
      is_running: isBackfilling,
      progress: isBackfilling ? backfillProgress : null,
      last_result: lastBackfillResult,
      stats: {
        total_active_reports: parseInt(stats?.total || "0"),
        with_content: parseInt(stats?.with_content || "0"),
        without_content: parseInt(stats?.without_content || "0"),
        with_tabulky: parseInt(stats?.with_tabulky || "0"),
        percent_complete: stats
          ? (
              (parseInt(stats.with_content || "0") /
                Math.max(1, parseInt(stats.total || "1"))) *
              100
            ).toFixed(1)
          : "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
