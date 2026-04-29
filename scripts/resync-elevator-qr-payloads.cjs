/**
 * Tüm elevator_assets.qr_payload değerlerini güncel canonical URL ile yazar (/go/{uuid}).
 * NEXT_PUBLIC_APP_URL veya NEXT_PUBLIC_SITE_URL + DATABASE_URL kullanır (.env.local).
 *
 * Usage:
 *   npm run db:resync-qr-payloads
 */
const path = require("path");
const pg = require("pg");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: false,
});

/** Kök URL parçası — `src/lib/elevator-qr.ts` canonicalElevatorUrl ile uyumlu */
function getPgConfig(connectionString) {
  const u = new URL(connectionString);
  const database = decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres");
  const password = u.password !== undefined && u.password !== null ? decodeURIComponent(u.password) : "";
  const host = u.hostname;
  const supabaseHost = host.endsWith(".supabase.co") || host.includes("pooler.supabase.com");
  return {
    host,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password,
    database,
    ssl: supabaseHost ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL tanımlı değil (.env.local).");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!appUrl && !siteUrl) {
    console.warn(
      "Uyarı: NEXT_PUBLIC_APP_URL ve NEXT_PUBLIC_SITE_URL yok; qr_payload kökü olmadan /go/{uuid} olarak yazılır.",
    );
  }

  const client = new pg.Client(getPgConfig(databaseUrl));
  await client.connect();

  const root = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
    "";

  try {
    const res = await client.query(
      `UPDATE elevator_assets ea
       SET qr_payload = $1 || '/go/' || ea.id::text
       WHERE ea.qr_payload IS DISTINCT FROM ($1 || '/go/' || ea.id::text)`,
      [root],
    );
    const n = res.rowCount ?? 0;
    const { rows: countRows } = await client.query(`SELECT COUNT(*)::int AS c FROM elevator_assets`);
    const total = countRows[0]?.c ?? 0;
    console.log(`elevator_assets: toplam ${total} satır, ${n} güncellendi (öncekinden farklı olanlar).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
