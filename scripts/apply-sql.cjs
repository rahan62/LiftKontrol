/**
 * Apply a single SQL file to DATABASE_URL (for DBs that already ran initial migrations).
 * Usage: node scripts/apply-sql.cjs supabase/migrations/20250330120000_periodic_controls_revisions_logo.sql
 */
const fs = require("fs");
const path = require("path");
const pg = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: false });

function getPgConfig(connectionString) {
  const u = new URL(connectionString);
  const database = decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres");
  const password =
    u.password !== undefined && u.password !== null ? decodeURIComponent(u.password) : "";
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
  const rel = process.argv[2];
  if (!rel) {
    console.error("Usage: node scripts/apply-sql.cjs <path-to.sql>");
    process.exit(1);
  }
  const full = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) {
    console.error("File not found:", full);
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Set DATABASE_URL in .env.local");
    process.exit(1);
  }
  const sql = fs.readFileSync(full, "utf8");
  const client = new pg.Client(getPgConfig(databaseUrl));
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied:", rel);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
