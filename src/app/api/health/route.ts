import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/health - Lightweight healthcheck endpoint
 * Used by Railway to verify the app is running.
 * Only does a simple SELECT 1 to verify DB connectivity.
 */
export async function GET() {
  try {
    const result = await queryOne<{ ok: number }>("SELECT 1 as ok");
    return NextResponse.json({
      status: "ok",
      db: result?.ok === 1 ? "connected" : "error",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
