import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runFullSync } from "@/lib/sync";

/**
 * Cron endpoint pre automatickú dennú synchronizáciu.
 * Vercel Cron Jobs volá tento endpoint podľa nastavenia v vercel.json.
 * Schedule: 0 3 * * * (denne o 3:00)
 */
export async function GET(request: NextRequest) {
  // Overenie, že request pochádza z Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] Spúšťam dennú synchronizáciu...");
    const result = await runFullSync();
    console.log("[CRON] Synchronizácia dokončená:", result);

    return NextResponse.json({
      status: "completed",
      result,
    });
  } catch (error) {
    console.error("[CRON] Chyba synchronizácie:", error);
    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Vercel Cron: max execution time
export const maxDuration = 300; // 5 minút (Vercel Pro)
