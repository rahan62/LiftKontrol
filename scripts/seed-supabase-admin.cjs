/**
 * Create the first Supabase Auth user + tenant_owner row (fresh Supabase project).
 * Uses Admin API (service_role) for auth, then DATABASE_URL (Postgres) for tenant_members.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL — https://YOUR_REF.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — Dashboard → Settings → API → service_role (secret; never commit)
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 *   DATABASE_URL — pooler or direct Postgres URI for the same project
 *
 * Usage: npm run db:seed-supabase-admin
 */
const fs = require("fs");
const path = require("path");
const pg = require("pg");
const { createClient } = require("@supabase/supabase-js");

// override: true — if SUPABASE_SERVICE_ROLE_KEY is set empty in the shell, dotenv would otherwise skip .env.local.
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
  const supabaseUrl = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const email = stripQuotes(process.env.SEED_ADMIN_EMAIL);
  const plainPassword = stripQuotes(process.env.SEED_ADMIN_PASSWORD);
  const companyName = process.env.SEED_COMPANY_NAME || "Elevator Services (Admin)";
  const companySlug = process.env.SEED_COMPANY_SLUG || "main";

  if (!email || !plainPassword) {
    console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local");
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL must be the HTTPS API URL (https://….supabase.co), not postgresql://",
    );
    process.exit(1);
  }
  if (!serviceKey) {
    const envPath = path.join(__dirname, "..", ".env.local");
    let hint = "";
    try {
      const raw = fs.readFileSync(envPath, "utf8");
      if (/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*$/m.test(raw)) {
        hint =
          "\nYour .env.local has SUPABASE_SERVICE_ROLE_KEY= with nothing after the equals sign.\n" +
          "Paste the service_role JWT on that same line (no quotes), then save the file.\n";
      } else if (!/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=/m.test(raw)) {
        hint =
          "\nNo SUPABASE_SERVICE_ROLE_KEY= line found in .env.local. Add it under the API keys section.\n";
      }
    } catch {
      hint = `\nCould not read ${envPath}.\n`;
    }
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is missing or empty.\n" +
        "Paste it from Supabase → Project Settings → API → service_role (secret). Never commit it.\n" +
        "If it is set in the file but this still fails: save .env.local, and run `unset SUPABASE_SERVICE_ROLE_KEY` in case the shell exported it empty.\n" +
        hint,
    );
    process.exit(1);
  }

  let databaseUrl = stripQuotes(process.env.DATABASE_URL);
  if (!databaseUrl) {
    console.error("Set DATABASE_URL in .env.local (same Supabase Postgres connection you use for migrations).");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: plainPassword,
    email_confirm: true,
    user_metadata: { full_name: "Company admin" },
  });

  if (createErr) {
    const msg = (createErr.message || "").toLowerCase();
    const duplicate =
      msg.includes("already been registered") ||
      msg.includes("already exists") ||
      msg.includes("already registered") ||
      createErr.code === "email_exists";
    if (!duplicate) throw createErr;

    const pgQuick = new pg.Client(getPgConfig(databaseUrl));
    await pgQuick.connect();
    try {
      const r = await pgQuick.query("SELECT id FROM auth.users WHERE lower(email) = lower($1)", [
        email,
      ]);
      if (!r.rows.length) throw createErr;
      userId = r.rows[0].id;
      console.log("Auth user already exists:", email, userId);
    } finally {
      await pgQuick.end();
    }
  } else {
    userId = created.user.id;
    console.log("Created Supabase Auth user:", email, userId);
  }

  const client = new pg.Client(getPgConfig(databaseUrl));
  await client.connect();

  try {
    await client.query("BEGIN");

    const tenantCheck = await client.query(
      `SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = $1 LIMIT 1`,
      [userId],
    );

    if (tenantCheck.rows.length) {
      console.log("User already has tenant membership:", tenantCheck.rows[0].tenant_id);
      await client.query("COMMIT");
      console.log("Done.");
      return;
    }

    const slugCheck = await client.query(`SELECT id FROM public.tenants WHERE slug = $1`, [
      companySlug,
    ]);
    let tenantId;
    if (slugCheck.rows.length) {
      tenantId = slugCheck.rows[0].id;
      console.log("Using existing tenant slug:", companySlug, tenantId);
    } else {
      const t = await client.query(
        `INSERT INTO public.tenants (name, slug) VALUES ($1, $2) RETURNING id`,
        [companyName, companySlug],
      );
      tenantId = t.rows[0].id;
      console.log("Created tenant:", companyName, tenantId);
    }

    await client.query(
      `INSERT INTO public.tenant_members (tenant_id, user_id, system_role, is_active)
       VALUES ($1, $2, 'tenant_owner', true)
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [tenantId, userId],
    );

    console.log("Linked tenant_owner membership for user → tenant.");

    await client.query("COMMIT");
    console.log("Done. Sign in on web or iOS with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
