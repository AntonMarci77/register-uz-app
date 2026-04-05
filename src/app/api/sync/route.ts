import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryCount } from "@/lib/db-raw";
import { runFullSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync - Trigger a full sync in background
 * Returns immediately with status: "syncing"
 *
 * GET /api/sync - Get latest sync status
 * Returns shape matching SyncStatus type: { last_sync, total_records, status, error_message }
 */

// Track whether a sync is currently running (in-memory flag for this server instance)
let isSyncing = false;
let currentSyncError: string | null = null;

export async function POST(request: NextRequest) {
  try {
    if (isSyncing) {
      return NextResponse.json(
        { last_sync: null, total_records: 0, status: "syncing", error_message: null },
        { status: 200 }
      );
    }

    isSyncing = true;
    currentSyncError = null;

    // Start background sync without awaiting — the POST returns immediately
    runFullSync()
      .then((result) => {
        console.log("[SYNC] Full sync completed:", JSON.stringify(result, null, 2));
        isSyncing = false;
        currentSyncError = null;
      })
      .catch((err) => {
        console.error("[SYNC] Full sync failed:", err);
        isSyncing = false;
        currentSyncError = err instanceof Error ? err.message : String(err);
      });

    return NextResponse.json(
      { last_sync: null, total_records: 0, status: "syncing", error_message: null },
      { status: 202 }
    );
  } catch (error) {
    console.error("Sync trigger error:", error);
    isSyncing = false;
    return NextResponse.json(
      {
        last_sync: null,
        total_records: 0,
        status: "error",
        error_message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get counts using raw SQL
    const counts = await queryOne<{
      entities: string;
      statements: string;
      reports: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM "AccountingEntity") as entities,
        (SELECT COUNT(*) FROM "FinancialStatement") as statements,
        (SELECT COUNT(*) FROM "FinancialReport") as reports
    `);

    const entityCount = parseInt(counts?.entities || "0", 10);
    const statementCount = parseInt(counts?.statements || "0", 10);
    const reportCount = parseInt(counts?.reports || "0", 10);
    const totalRecords = entityCount + statementCount + reportCount;

    // If currently syncing, return syncing status
    if (isSyncing) {
      return NextResponse.json({
        last_sync: null,
        total_records: totalRecords,
        status: "syncing",
        error_message: null,
        counts: { entities: entityCount, statements: statementCount, reports: reportCount },
      });
    }

    // Get the most recent completed sync log using raw SQL
    const lastLog = await queryOne<{
      startedAt: string;
      completedAt: string | null;
      status: string;
      error: string | null;
    }>(`
      SELECT "startedAt", "completedAt", status, error
      FROM "SyncLog"
      WHERE status IN ('completed', 'error')
      ORDER BY "completedAt" DESC NULLS LAST
      LIMIT 1
    `);

    if (!lastLog && totalRecords === 0 && !currentSyncError) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      last_sync: lastLog?.completedAt ?? lastLog?.startedAt ?? null,
      total_records: totalRecords,
      status: currentSyncError ? "error" : "idle",
      error_message: currentSyncError ?? lastLog?.error ?? null,
      counts: { entities: entityCount, statements: statementCount, reports: reportCount },
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      {
        last_sync: null,
        total_records: 0,
        status: "error",
        error_message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
