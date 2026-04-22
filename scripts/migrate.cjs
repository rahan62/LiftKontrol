/**
 * Run SQL migrations against DATABASE_URL from .env.local.
 * Works with local Postgres (e.g. /ElevatorMaintenance) or Supabase (path is usually /postgres).
 *
 * Usage:
 *   npm run db:migrate
 *   npm run db:migrate -- --from 20260329180000     # skip older files (DB already has them; no tracking)
 *   npm run db:migrate -- --only 20260329180000_route_clusters_daily_dispatch.sql
 *
 * Applied migrations are skipped when:
 *   - listed in supabase_migrations.schema_migrations (Supabase CLI), or
 *   - listed in public._app_sql_migrations (this script).
 */
const fs = require("fs");
const path = require("path");
const pg = require("pg");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: false,
});

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

/** Local dev only: fake auth schema. Supabase already owns `auth` — running this there causes "permission denied for schema auth". */
const LOCAL_POSTGRES_PREREQ = "20250325000000_local_postgres_prereq.sql";

const APP_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS public._app_sql_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

/** @param {string} filename e.g. 20260329180000_route_clusters_daily_dispatch.sql */
function migrationVersion(filename) {
  const m = /^(\d+)_/.exec(filename);
  return m ? m[1] : filename;
}

/** @param {string} urlString */
function isSupabaseDatabaseUrl(urlString) {
  try {
    const h = new URL(urlString).hostname;
    return h.endsWith(".supabase.co") || h.includes("pooler.supabase.com");
  } catch {
    return false;
  }
}

/** @param {string} connectionString */
function getPgConfig(connectionString) {
  const u = new URL(connectionString);
  const database = decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres");
  const password = u.password !== undefined && u.password !== null ? decodeURIComponent(u.password) : "";
  const host = u.hostname;
  const supabaseHost =
    host.endsWith(".supabase.co") || host.includes("pooler.supabase.com");
  return {
    host,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password,
    database,
    ssl: supabaseHost ? { rejectUnauthorized: false } : undefined,
  };
}

async function ensureDatabase(adminConfig, dbName) {
  const admin = new pg.Client(adminConfig);
  await admin.connect();
  try {
    const safe = dbName.replace(/"/g, '""');
    await admin.query(`CREATE DATABASE "${safe}"`);
    console.log(`Created database "${safe}".`);
  } catch (e) {
    if (e.code === "42P04") {
      console.log(`Database "${dbName}" already exists.`);
    } else {
      throw e;
    }
  }
  await admin.end();
}

/**
 * @param {import('pg').Client} client
 * @returns {Promise<Set<string>|null>} null if table/schema missing
 */
async function getSupabaseAppliedVersions(client) {
  try {
    const { rows } = await client.query(
      `SELECT version::text AS v FROM supabase_migrations.schema_migrations`,
    );
    return new Set(rows.map((r) => String(r.v)));
  } catch (e) {
    if (e.code === "42P01" || e.code === "3F000") return null;
    throw e;
  }
}

/**
 * @param {import('pg').Client} client
 * @returns {Promise<Set<string>>}
 */
async function getAppAppliedFilenames(client) {
  try {
    const { rows } = await client.query(`SELECT filename FROM public._app_sql_migrations`);
    return new Set(rows.map((r) => String(r.filename)));
  } catch (e) {
    if (e.code === "42P01") return new Set();
    throw e;
  }
}

/**
 * @param {import('pg').Client} client
 * @param {string} filename
 */
async function recordApplied(client, filename) {
  await client.query(
    `INSERT INTO public._app_sql_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
    [filename],
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const fromIdx = argv.indexOf("--from");
  const fromVersion = fromIdx >= 0 && argv[fromIdx + 1] ? String(argv[fromIdx + 1]).trim() : null;
  const onlyIdx = argv.indexOf("--only");
  const onlyFile = onlyIdx >= 0 && argv[onlyIdx + 1] ? String(argv[onlyIdx + 1]).trim() : null;

  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "Set DATABASE_URL in .env.local (e.g. postgresql://postgres:PASSWORD@localhost:5432/ElevatorMaintenance)",
    );
    process.exit(1);
  }

  if (databaseUrl.includes("YOUR_PASSWORD") && process.env.PGPASSWORD) {
    databaseUrl = databaseUrl.replace(
      "YOUR_PASSWORD",
      encodeURIComponent(process.env.PGPASSWORD),
    );
  }

  if (databaseUrl.includes("YOUR_PASSWORD")) {
    console.error(
      "Set your real postgres password in .env.local (replace YOUR_PASSWORD), or run:\n" +
        "  PGPASSWORD='yourpassword' npm run db:migrate\n" +
        "SCRAM auth requires a non-empty password (pg cannot use an empty password).",
    );
    process.exit(1);
  }

  const u = new URL(databaseUrl);
  const dbName = decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres");
  if (!dbName) {
    console.error(
      "DATABASE_URL must include a database name in the path (e.g. /postgres for Supabase, /ElevatorMaintenance for local).",
    );
    process.exit(1);
  }

  if (dbName !== "postgres") {
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = "/postgres";
    const adminCfg = getPgConfig(adminUrl.toString());
    adminCfg.database = "postgres";
    await ensureDatabase(adminCfg, dbName);
  }

  let files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (onlyFile) {
    if (!files.includes(onlyFile)) {
      console.error(`Unknown migration file: ${onlyFile}`);
      process.exit(1);
    }
    files = [onlyFile];
  }

  const client = new pg.Client(getPgConfig(databaseUrl));
  await client.connect();
  console.log(`Connected to ${dbName}.`);

  try {
    await client.query(APP_MIGRATIONS_TABLE);

    const supabaseApplied = await getSupabaseAppliedVersions(client);
    if (supabaseApplied) {
      console.log(
        `Using supabase_migrations.schema_migrations (${supabaseApplied.size} version(s)); also checking _app_sql_migrations.`,
      );
    } else {
      console.log(
        "No supabase_migrations.schema_migrations (or no access) — using public._app_sql_migrations only.\n" +
          "If the DB already has older migrations but this is the first tracked run, use:\n" +
          "  npm run db:migrate -- --from 20260329180000\n" +
          "(replace with the first migration version you still need to apply).",
      );
    }

    const appApplied = await getAppAppliedFilenames(client);
    const skipLocalPrereq = isSupabaseDatabaseUrl(databaseUrl);

    for (const file of files) {
      if (file === LOCAL_POSTGRES_PREREQ && skipLocalPrereq) {
        console.log(`Skipping ${file} (Supabase already has auth; this file is for plain local Postgres).`);
        continue;
      }

      const ver = migrationVersion(file);

      if (fromVersion && ver < fromVersion) {
        console.log(`Skipping ${file} (--from ${fromVersion}).`);
        continue;
      }

      if (supabaseApplied && supabaseApplied.has(ver)) {
        console.log(`Skipping ${file} (already in supabase_migrations: ${ver}).`);
        continue;
      }

      if (appApplied.has(file)) {
        console.log(`Skipping ${file} (already in _app_sql_migrations).`);
        continue;
      }

      const full = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(full, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      await recordApplied(client, file);
      console.log(`  OK`);
    }
  } finally {
    await client.end();
  }

  console.log("Migrations finished.");
}

main().catch((e) => {
  console.error(e);
  const url = process.env.DATABASE_URL || "";
  if (e.code === "ENOTFOUND" && url.includes("supabase.co") && url.includes("db.")) {
    console.error(
      "\nThis host is often IPv6-only. If your network has no IPv6, use the Session pooler URI from\n" +
        "Supabase Dashboard → Project Settings → Database (or Connect): host like aws-0-*.pooler.supabase.com,\n" +
        "user postgres.<project_ref>, port 5432. See .env.local.example notes on DATABASE_URL.\n",
    );
  }
  process.exit(1);
});
