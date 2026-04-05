import pg from "pg";

/**
 * Shared raw SQL database helper
 *
 * Uses pg.Pool for connection pooling instead of creating new clients
 * for each request. This is more efficient for concurrent API requests.
 *
 * Replaces Prisma which has compatibility issues with Next.js/Turbopack.
 */

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not set");
    }
    pool = new pg.Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * Execute a single SQL query with parameters
 */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  return p.query<T>(sql, params);
}

/**
 * Execute a query and return just the rows
 */
export async function queryRows<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(sql, params);
  return result.rows;
}

/**
 * Execute a query and return the first row (or null)
 */
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows[0] || null;
}

/**
 * Execute a COUNT query and return the number
 */
export async function queryCount(
  sql: string,
  params?: any[]
): Promise<number> {
  const result = await query(sql, params);
  return parseInt(result.rows[0]?.count || "0", 10);
}

/**
 * Get a client from the pool for transactions or multiple sequential queries
 */
export async function getClient(): Promise<pg.PoolClient> {
  return getPool().connect();
}

/**
 * Helper to extract Slovak name from JSONB nazov field
 */
export function getNazovSK(nazov: any): string | null {
  if (!nazov) return null;
  if (typeof nazov === "string") return nazov;
  if (typeof nazov === "object") {
    return (nazov.sk || nazov.SK || Object.values(nazov)[0] as string) || null;
  }
  return null;
}

/**
 * Build a WHERE clause from filter conditions
 * Returns { clause: string, params: any[], nextParamIndex: number }
 */
export function buildWhere(
  conditions: Array<{ field: string; op: string; value: any } | null>,
  startIndex: number = 1
): { clause: string; params: any[]; nextIndex: number } {
  const validConditions = conditions.filter(
    (c): c is { field: string; op: string; value: any } =>
      c !== null && c.value !== undefined && c.value !== null && c.value !== ""
  );

  if (validConditions.length === 0) {
    return { clause: "", params: [], nextIndex: startIndex };
  }

  const parts: string[] = [];
  const params: any[] = [];
  let idx = startIndex;

  for (const cond of validConditions) {
    if (cond.op === "ILIKE") {
      parts.push(`${cond.field} ILIKE $${idx}`);
      params.push(`%${cond.value}%`);
    } else {
      parts.push(`${cond.field} ${cond.op} $${idx}`);
      params.push(cond.value);
    }
    idx++;
  }

  return {
    clause: "AND " + parts.join(" AND "),
    params,
    nextIndex: idx,
  };
}
