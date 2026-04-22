import { Pool, type PoolConfig } from "pg";

let pool: Pool | null = null;

function supabasePgSslOption(connectionString: string): PoolConfig["ssl"] | undefined {
  try {
    const host = new URL(connectionString).hostname;
    const supabaseHost =
      host.endsWith(".supabase.co") || host.includes("pooler.supabase.com");
    // `scripts/migrate.cjs` ile aynı: pooler / bazı ağlarda zincirde kurumsal CA veya ara sertifika
    // Node’un varsayılan doğrulaması `SELF_SIGNED_CERT_IN_CHAIN` verebilir.
    if (supabaseHost) {
      return { rejectUnauthorized: false };
    }
  } catch {
    /* geçersiz URL — bağlantıda pg hata verir */
  }
  return undefined;
}

export function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Set DATABASE_URL in .env.local for local database access.");
  }
  const ssl = supabasePgSslOption(url);
  pool = new Pool({
    connectionString: url,
    max: 10,
    ...(ssl ? { ssl } : {}),
  });
  return pool;
}
