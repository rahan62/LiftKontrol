/**
 * Supabase Auth kullanıcısı oluşturur ve mevcut bir kiracıya `tenant_members` satırı ekler.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *
 * Kullanım:
 *   SEED_USER_EMAIL=a@b.com SEED_USER_PASSWORD=secret SEED_USER_ROLE=technician npm run db:seed-user
 *
 * Kiracı: SEED_TARGET_TENANT_ID (uuid) yoksa, herhangi bir aktif üyenin tenant_id’si kullanılır.
 */
const path = require("path");
const pg = require("pg");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const ALLOWED_ROLES = new Set([
  "tenant_owner",
  "company_admin",
  "dispatcher",
  "service_manager",
  "technician",
  "warehouse_manager",
  "finance",
  "sales_quotation",
  "customer_support_readonly",
  "customer_portal_user",
]);

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
  const email = stripQuotes(process.env.SEED_USER_EMAIL);
  const plainPassword = stripQuotes(process.env.SEED_USER_PASSWORD);
  const role = stripQuotes(process.env.SEED_USER_ROLE || "technician").toLowerCase();
  const targetTenant = stripQuotes(process.env.SEED_TARGET_TENANT_ID || "");

  if (!email || !plainPassword) {
    console.error("Set SEED_USER_EMAIL and SEED_USER_PASSWORD");
    process.exit(1);
  }
  if (!ALLOWED_ROLES.has(role)) {
    console.error("SEED_USER_ROLE must be one of:", [...ALLOWED_ROLES].join(", "));
    process.exit(1);
  }
  if (!supabaseUrl?.startsWith("http") || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.");
    process.exit(1);
  }

  let databaseUrl = stripQuotes(process.env.DATABASE_URL);
  if (!databaseUrl) {
    console.error("DATABASE_URL required.");
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
    user_metadata: { full_name: email.split("@")[0] },
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
    let tenantId = targetTenant || null;
    if (tenantId) {
      const ok = await client.query(`SELECT 1 FROM public.tenants WHERE id = $1::uuid`, [
        tenantId,
      ]);
      if (!ok.rows.length) {
        throw new Error(`SEED_TARGET_TENANT_ID not found: ${tenantId}`);
      }
    } else {
      const t = await client.query(
        `SELECT tenant_id::text AS tenant_id FROM public.tenant_members
         WHERE is_active = true
         ORDER BY joined_at ASC
         LIMIT 1`,
      );
      if (!t.rows.length) {
        throw new Error("No tenant_members row found. Run db:seed-supabase-admin first.");
      }
      tenantId = t.rows[0].tenant_id;
      console.log("Using tenant_id:", tenantId);
    }

    await client.query(
      `INSERT INTO public.tenant_members (tenant_id, user_id, system_role, is_active)
       VALUES ($1::uuid, $2::uuid, $3, true)
       ON CONFLICT (tenant_id, user_id) DO UPDATE
       SET system_role = EXCLUDED.system_role, is_active = true`,
      [tenantId, userId, role],
    );

    console.log("Linked membership:", role, "→ tenant", tenantId);
    console.log("Done. Sign in with", email);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
