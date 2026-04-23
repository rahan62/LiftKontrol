/**
 * Grant Lift Kontrol platform admin access (platform_operators row).
 *
 * Requires DATABASE_URL and SEED_PLATFORM_ADMIN_EMAIL in .env.local (repo root).
 *
 * Usage: npm run db:seed-platform-operator
 */
const path = require("path");
const pg = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

function stripQuotes(s) {
  if (!s) return s;
  const t = s.trim();
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function getPgConfig(connectionString) {
  const u = new URL(connectionString);
  const database = decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres");
  const password =
    u.password !== undefined && u.password !== null ? decodeURIComponent(u.password) : "";
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password,
    database,
    ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  const email = stripQuotes(process.env.SEED_PLATFORM_ADMIN_EMAIL);
  const databaseUrl = stripQuotes(process.env.DATABASE_URL);
  const role = stripQuotes(process.env.SEED_PLATFORM_ADMIN_ROLE) || "owner";

  if (!email) {
    console.error("Set SEED_PLATFORM_ADMIN_EMAIL in .env.local (same account as Supabase Auth user).");
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error("Set DATABASE_URL in .env.local.");
    process.exit(1);
  }
  if (!["owner", "admin", "support"].includes(role)) {
    console.error("SEED_PLATFORM_ADMIN_ROLE must be owner | admin | support");
    process.exit(1);
  }

  const client = new pg.Client(getPgConfig(databaseUrl));
  await client.connect();
  try {
    const u = await client.query("SELECT id FROM auth.users WHERE lower(email) = lower($1)", [email]);
    if (!u.rows.length) {
      console.error("No auth.users row for email:", email, "— create the user first (e.g. db:seed-supabase-admin).");
      process.exit(1);
    }
    const userId = u.rows[0].id;

    const p = await client.query("SELECT id FROM public.profiles WHERE id = $1", [userId]);
    if (!p.rows.length) {
      console.error("No public.profiles row for user — profile trigger may be missing.");
      process.exit(1);
    }

    await client.query(
      `INSERT INTO public.platform_operators (user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
      [userId, role],
    );
    console.log("Platform operator linked:", email, "role=", role);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
