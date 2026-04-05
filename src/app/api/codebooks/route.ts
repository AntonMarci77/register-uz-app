import { NextResponse } from "next/server";
import pg from "pg";

// Force Next.js to treat this as a dynamic route (no caching)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * GET /api/codebooks - Returns all codebook data via raw SQL
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const timestamp = new Date().toISOString();

  if (!dbUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL not set", timestamp, version: "v2-raw-sql" },
      { status: 500 }
    );
  }

  let client: pg.Client | null = null;

  try {
    client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    // Sequential queries to avoid any pg client concurrency issues
    const pravneFormyRes = await client.query('SELECT kod, nazov FROM "PravnaForma" ORDER BY kod');
    const skNaceRes = await client.query('SELECT kod, nazov FROM "SkNace" ORDER BY kod');
    const druhyVlastnictvaRes = await client.query('SELECT kod, nazov FROM "DruhVlastnictva" ORDER BY kod');
    const velkostiRes = await client.query('SELECT kod, nazov FROM "VelkostOrganizacie" ORDER BY kod');
    const krajeRes = await client.query('SELECT kod, nazov FROM "Kraj" ORDER BY kod');
    const okresyRes = await client.query('SELECT kod, nazov, "nadradenaLokacia" FROM "Okres" ORDER BY kod');
    const sidlaRes = await client.query('SELECT kod, nazov, "nadradenaLokacia" FROM "Sidlo" ORDER BY kod');
    const sablonyRes = await client.query('SELECT id, nazov, "nariadenieMF", "platneOd", "platneDo" FROM "ReportTemplate" ORDER BY nazov');

    const pravneFormy = transformCodebook(pravneFormyRes.rows);
    const skNace = transformCodebook(skNaceRes.rows);
    const druhyVlastnictva = transformCodebook(druhyVlastnictvaRes.rows);
    const velkosti = transformCodebook(velkostiRes.rows);
    const kraje = transformCodebook(krajeRes.rows);
    const okresy = transformCodebook(okresyRes.rows);
    const sidla = transformCodebook(sidlaRes.rows);
    const sablony = sablonyRes.rows.map((s: any) => ({
      id: s.id,
      nazov: s.nazov || `Šablóna ${s.id}`,
      nariadenieMF: s.nariadenieMF,
      platneOd: s.platneOd,
      platneDo: s.platneDo,
    }));

    return NextResponse.json({
      version: "v2-raw-sql",
      timestamp,
      codebooks: {
        pravneFormy,
        skNace,
        druhyVlastnictva,
        velkosti,
        kraje,
        okresy,
        sidla,
        sablony,
      },
      counts: {
        pravneFormy: pravneFormy.length,
        skNace: skNace.length,
        druhyVlastnictva: druhyVlastnictva.length,
        velkosti: velkosti.length,
        kraje: kraje.length,
        okresy: okresy.length,
        sidla: sidla.length,
        sablony: sablony.length,
      },
    });
  } catch (error) {
    console.error("Error fetching codebooks:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch codebooks",
        details: error instanceof Error ? error.message : String(error),
        timestamp,
        version: "v2-raw-sql",
      },
      { status: 500 }
    );
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

/**
 * Transform codebook entries with support for multilingual names (JSON)
 */
function transformCodebook(rows: any[]): any[] {
  return rows.map((entry) => ({
    kod: entry.kod,
    nazov: entry.nazov,
    // Provide Slovak name as primary text if available
    text: getNazovSK(entry.nazov) || entry.kod,
    // Keep location hierarchy data if present
    nadradenaLokacia: entry.nadradenaLokacia || undefined,
  }));
}

/**
 * Extract Slovak name from multilingual JSON object
 */
function getNazovSK(nazov: any): string | null {
  if (!nazov) return null;

  // If it's already a string
  if (typeof nazov === "string") return nazov;

  // If it's an object, prefer Slovak ("sk") or default to first available
  if (typeof nazov === "object") {
    return (
      nazov.sk ||
      nazov.SK ||
      nazov["sk"] ||
      Object.values(nazov)[0] ||
      null
    );
  }

  return null;
}
