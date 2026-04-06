import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health - Lightweight healthcheck endpoint
 * Used by Railway to verify the app is running.
 * No database access — just confirms the Next.js server is responding.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
