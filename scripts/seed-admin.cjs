/**
 * Seed a company admin: auth.users + profiles (via trigger) + tenants + tenant_members.
 * Requires DATABASE_URL in .env.local (local PostgreSQL).
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=a@b.com SEED_ADMIN_PASSWORD='secret' npm run db:seed-admin
 *
 * Optional:
 *   SEED_COMPANY_NAME="Acme Elevator" SEED_COMPANY_SLUG=acme
 */
const path = require("path");
const pg = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: false });

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
  };
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const plainPassword = process.env.SEED_ADMIN_PASSWORD;
  const companyName = process.env.SEED_COMPANY_NAME || "Elevator Services (Admin)";
  const companySlug = process.env.SEED_COMPANY_SLUG || "main";

  if (!email || !plainPassword) {
    console.error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (e.g. SEED_ADMIN_EMAIL=x SEED_ADMIN_PASSWORD=y npm run db:seed-admin)",
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Set DATABASE_URL in .env.local");
    process.exit(1);
  }

  const client = new pg.Client(getPgConfig(databaseUrl));
  await client.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM auth.users WHERE email = $1", [email]);
    let userId;

    if (existing.rows.length) {
      userId = existing.rows[0].id;
      console.log("User already exists in auth.users:", email, userId);
    } else {
      const ins = await client.query(
        `INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at)
         VALUES (
           gen_random_uuid(),
           $1,
           $2::jsonb,
           crypt($3, gen_salt('bf')),
           now()
         )
         RETURNING id`,
        [email, JSON.stringify({ full_name: "Company admin" }), plainPassword],
      );
      userId = ins.rows[0].id;
      console.log("Created auth user:", email, userId);
    }

    const tenantCheck = await client.query(
      `SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = $1 LIMIT 1`,
      [userId],
    );

    if (tenantCheck.rows.length) {
      console.log("User already has tenant membership:", tenantCheck.rows[0].tenant_id);
      await client.query("COMMIT");
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
    console.log("Done.");
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
