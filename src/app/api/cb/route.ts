import { NextResponse } from "next/server";
import { queryRows, getNazovSK } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/cb - Returns all codebook data via raw SQL
 * Replaces /api/codebooks which had Next.js caching issues
 */
export async function GET() {
  try {
    const [pravneFormyRows, skNaceRows, dvRows, voRows, krajeRows, okresyRows, sidlaRows, sablonyRows] = await Promise.all([
      queryRows('SELECT kod, nazov FROM "PravnaForma" ORDER BY kod'),
      queryRows('SELECT kod, nazov FROM "SkNace" ORDER BY kod'),
      queryRows('SELECT kod, nazov FROM "DruhVlastnictva" ORDER BY kod'),
      queryRows('SELECT kod, nazov FROM "VelkostOrganizacie" ORDER BY kod'),
      queryRows('SELECT kod, nazov FROM "Kraj" ORDER BY kod'),
      queryRows('SELECT kod, nazov, "nadradenaLokacia" FROM "Okres" ORDER BY kod'),
      queryRows('SELECT kod, nazov, "nadradenaLokacia" FROM "Sidlo" ORDER BY kod'),
      queryRows('SELECT id, nazov, "nariadenieMF", "platneOd", "platneDo" FROM "ReportTemplate" ORDER BY nazov'),
    ]);

    const transform = (rows: any[]) => rows.map((r) => ({
      kod: r.kod,
      nazov: r.nazov,
      text: getNazovSK(r.nazov) || r.kod,
      nadradenaLokacia: r.nadradenaLokacia || undefined,
    }));

    const pravneFormy = transform(pravneFormyRows);
    const skNace = transform(skNaceRows);
    const druhyVlastnictva = transform(dvRows);
    const velkosti = transform(voRows);
    const kraje = transform(krajeRows);
    const okresy = transform(okresyRows);
    const sidla = transform(sidlaRows);
    const sablony = sablonyRows.map((s: any) => ({
      id: s.id,
      nazov: s.nazov || `Šablóna ${s.id}`,
      nariadenieMF: s.nariadenieMF,
      platneOd: s.platneOd,
      platneDo: s.platneDo,
    }));

    return NextResponse.json({
      codebooks: { pravneFormy, skNace, druhyVlastnictva, velkosti, kraje, okresy, sidla, sablony },
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
  } catch (err) {
    console.error("Error fetching codebooks:", err);
    return NextResponse.json({
      error: "Failed to fetch codebooks",
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
