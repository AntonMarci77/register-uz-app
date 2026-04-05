import { NextRequest, NextResponse } from "next/server";
import pg from "pg";

/**
 * DEBUG endpoint — priamy SQL dotaz bez Prisma
 * GET /api/codebooks-debug
 */
export async function GET(request: NextRequest) {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set", env: Object.keys(process.env).filter(k => k.includes("DATA")).join(", ") });
  }

  let client: pg.Client | null = null;

  try {
    client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    // Raw SQL queries
    const [krajRes, pravneFormyRes, velkostiRes, entityRes] = await Promise.all([
      client.query('SELECT kod, nazov FROM "Kraj" ORDER BY kod LIMIT 5'),
      client.query('SELECT COUNT(*) as count FROM "PravnaForma"'),
      client.query('SELECT COUNT(*) as count FROM "VelkostOrganizacie"'),
      client.query('SELECT COUNT(*) as count FROM "AccountingEntity"'),
    ]);

    return NextResponse.json({
      status: "ok",
      database_url_set: true,
      database_url_prefix: dbUrl.substring(0, 30) + "...",
      results: {
        kraje_sample: krajRes.rows,
        pravne_formy_count: pravneFormyRes.rows[0].count,
        velkosti_count: velkostiRes.rows[0].count,
        entity_count: entityRes.rows[0].count,
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      database_url_set: !!dbUrl,
      database_url_prefix: dbUrl ? dbUrl.substring(0, 30) + "..." : null,
    }, { status: 500 });
  } finally {
    if (client) await client.end().catch(() => {});
  }
}
