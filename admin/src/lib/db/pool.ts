import { Pool, type PoolConfig } from "pg";

let pool: Pool | null = null;

function supabasePgSslOption(connectionString: string): PoolConfig["ssl"] | undefined {
  try {
    const host = new URL(connectionString).hostname;
    const supabaseHost =
      host.endsWith(".supabase.co") || host.includes("pooler.supabase.com");
    if (supabaseHost) {
      return { rejectUnauthorized: false };
    }
  } catch {
    /* invalid URL */
  }
  return undefined;
}

export function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Set DATABASE_URL for admin DB helpers.");
  }
  const ssl = supabasePgSslOption(url);
  pool = new Pool({
    connectionString: url,
    max: 5,
    ...(ssl ? { ssl } : {}),
  });
  return pool;
}
