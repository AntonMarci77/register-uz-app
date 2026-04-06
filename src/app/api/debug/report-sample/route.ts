import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/report-sample
 *
 * Diagnostic endpoint that:
 * 1. Picks a sample report ID from the database
 * 2. Fetches it directly from the RÚZ API
 * 3. Returns the raw API response so we can see if `obsah` is present
 *
 * Query params:
 *   id=<number> - specific report ID to test (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Get a report ID to test
    const requestedId = request.nextUrl.searchParams.get("id");
    let reportId: number;

    if (requestedId) {
      reportId = parseInt(requestedId, 10);
    } else {
      // Pick a random report from DB that doesn't have content
      const row = await queryOne<{ id: number }>(
        `SELECT id FROM "FinancialReport" WHERE zmazany = false AND "tsNazovUJ" IS NULL ORDER BY id ASC LIMIT 1`
      );
      if (!row) {
        return NextResponse.json({ error: "No reports without content found" });
      }
      reportId = row.id;
    }

    // Fetch directly from RÚZ API
    const apiUrl = `https://www.registeruz.sk/cruz-public/api/uctovny-vykaz?id=${reportId}`;
    console.log(`[DEBUG] Fetching report ${reportId} from ${apiUrl}`);

    const startTime = Date.now();
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });

    const elapsed = Date.now() - startTime;

    if (!res.ok) {
      return NextResponse.json({
        reportId,
        apiUrl,
        httpStatus: res.status,
        statusText: res.statusText,
        elapsed_ms: elapsed,
        error: `API returned HTTP ${res.status}`,
        body: await res.text().catch(() => "(could not read body)"),
      });
    }

    const data = await res.json();

    // Analyze the response structure
    const analysis = {
      reportId,
      apiUrl,
      httpStatus: res.status,
      elapsed_ms: elapsed,
      topLevelKeys: Object.keys(data),
      hasObsah: "obsah" in data && data.obsah !== null && data.obsah !== undefined,
      obsahKeys: data.obsah ? Object.keys(data.obsah) : null,
      hasTitulnaStrana: !!data.obsah?.titulnaStrana,
      titulnaStranaKeys: data.obsah?.titulnaStrana ? Object.keys(data.obsah.titulnaStrana) : null,
      titulnaStranaSample: data.obsah?.titulnaStrana
        ? {
            nazovUctovnejJednotky: data.obsah.titulnaStrana.nazovUctovnejJednotky,
            ico: data.obsah.titulnaStrana.ico,
            typZavierky: data.obsah.titulnaStrana.typZavierky,
            obdobieOd: data.obsah.titulnaStrana.obdobieOd,
            obdobieDo: data.obsah.titulnaStrana.obdobieDo,
          }
        : null,
      hasTabulky: !!(data.obsah?.tabulky && data.obsah.tabulky.length > 0),
      tabulkyCount: data.obsah?.tabulky?.length || 0,
      tabulkyNames: data.obsah?.tabulky?.map((t: any) => t.nazov) || [],
      tabulkyFirstDataLength: data.obsah?.tabulky?.[0]?.data?.length || 0,
      // Include raw metadata fields (not obsah, to keep response small)
      idSablony: data.idSablony,
      pristupnostDat: data.pristupnostDat,
      mena: data.mena,
      datumPoslednejUpravy: data.datumPoslednejUpravy,
      zdrojDat: data.zdrojDat,
      zmazany: data.zmazany,
    };

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
