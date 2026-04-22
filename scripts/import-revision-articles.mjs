#!/usr/bin/env node
/**
 * Import EN 81-20 (or other) revision articles into revision_articles for a tenant.
 * The UI at /app/revision-articles remains available for manual adds/edits.
 *
 * The TSE PDF at vipasansor.com is largely image-based (no extractable text layer);
 * use OCR or copy-paste into JSON or a markdown file (see --md).
 *
 * Usage:
 *   TENANT_ID=<uuid> node scripts/import-revision-articles.mjs --json data/en8120-articles.example.json
 *   TENANT_ID=<uuid> node scripts/import-revision-articles.mjs --md my-articles.md
 *   TENANT_ID=<uuid> node scripts/import-revision-articles.mjs --json a.json --md b.md
 *
 * Env:
 *   DATABASE_URL — PostgreSQL connection string (same as .env.local)
 *   TENANT_ID — target tenant UUID (omit if ALL_TENANTS=1)
 *   ALL_TENANTS=1 — upsert the same catalog for every row in public.tenants
 *   DRY_RUN=1 — print rows only, no DB writes
 *
 * Markdown format (--md): each article starts with a line:
 *   ### 5.3.8.1 Düşme tehlikesine karşı koruma
 * followed by body text until the next ### line.
 */
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: false, quiet: true });

const CODE_RE = /^\d+(?:\.\d+)+$/;

function parseMarkdownArticles(text) {
  const headerRe = /^###\s+(\d+(?:\.\d+)+)\s+(.+)$/gm;
  const headers = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    headers.push({
      code: m[1],
      title: m[2].trim(),
      start: m.index,
      headerEnd: m.index + m[0].length,
    });
  }
  const out = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const bodyEnd = i + 1 < headers.length ? headers[i + 1].start : text.length;
    out.push({
      article_code: h.code,
      title: h.title,
      description: text.slice(h.headerEnd, bodyEnd).trim() || null,
      default_cost_try: null,
      ticket_tier: "green",
    });
  }
  return out;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("JSON root must be an array of articles");
  }
  return data.map((row, i) => {
    if (!row || typeof row !== "object") {
      throw new Error(`Invalid row at index ${i}`);
    }
    const article_code = String(row.article_code ?? "").trim();
    const title = String(row.title ?? "").trim();
    if (!article_code || !title) {
      throw new Error(`Row ${i}: article_code and title are required`);
    }
    if (!CODE_RE.test(article_code)) {
      throw new Error(`Row ${i}: article_code must look like 5.3.8.1 (got ${article_code})`);
    }
    let default_cost_try = null;
    if (row.default_cost_try !== undefined && row.default_cost_try !== null && row.default_cost_try !== "") {
      const n = Number(row.default_cost_try);
      if (!Number.isFinite(n)) {
        throw new Error(`Row ${i}: default_cost_try must be a number`);
      }
      default_cost_try = n;
    }
    const tierRaw = String(row.ticket_tier ?? "green").trim();
    const ticket_tier =
      tierRaw === "blue" || tierRaw === "yellow" || tierRaw === "red" || tierRaw === "green" ? tierRaw : "green";
    return {
      article_code,
      title,
      description: row.description != null ? String(row.description).trim() || null : null,
      default_cost_try,
      ticket_tier,
    };
  });
}

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

function parseArgs(argv) {
  const jsonFiles = [];
  const mdFiles = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json" && argv[i + 1]) {
      jsonFiles.push(argv[++i]);
    } else if (argv[i] === "--md" && argv[i + 1]) {
      mdFiles.push(argv[++i]);
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`Usage:
  TENANT_ID=<uuid> node scripts/import-revision-articles.mjs --json <file.json> [--md <file.md> ...]
  DRY_RUN=1 node scripts/import-revision-articles.mjs --json <file.json>   # validate / preview only

Env: DATABASE_URL, TENANT_ID (not needed when DRY_RUN=1)

--json   Array of { article_code, title, description?, default_cost_try? }
--md     Blocks: "### 5.3.8.1 Title" then body until next ###
`);
      process.exit(0);
    }
  }
  return { jsonFiles, mdFiles };
}

const { jsonFiles, mdFiles } = parseArgs(process.argv);
if (!jsonFiles.length && !mdFiles.length) {
  console.error("Provide --json path and/or --md path. Example:");
  console.error("  TENANT_ID=<uuid> node scripts/import-revision-articles.mjs --json data/en8120-articles.example.json");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

let articles = [];
for (const f of jsonFiles) {
  const abs = path.resolve(process.cwd(), f);
  articles = articles.concat(readJson(abs));
}
for (const f of mdFiles) {
  const abs = path.resolve(process.cwd(), f);
  const text = fs.readFileSync(abs, "utf8");
  const parsed = parseMarkdownArticles(text);
  if (!parsed.length) {
    console.warn(`Warning: no ### headers found in ${f} (expected lines like "### 5.3.8.1 Title")`);
  }
  articles = articles.concat(parsed);
}

const seen = new Set();
for (const a of articles) {
  if (seen.has(a.article_code)) {
    console.error(`Duplicate article_code in input: ${a.article_code}`);
    process.exit(1);
  }
  seen.add(a.article_code);
}

const tenantId = process.env.TENANT_ID?.trim();
const allTenants = process.env.ALL_TENANTS === "1" || process.env.ALL_TENANTS === "true";

if (dryRun) {
  console.log(`Prepared ${articles.length} article(s) (dry run, no DB).`);
  console.log(JSON.stringify(articles, null, 2));
  process.exit(0);
}

if (!tenantId && !allTenants) {
  console.error("Set TENANT_ID to your tenant UUID (public.tenants.id), or ALL_TENANTS=1.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Set DATABASE_URL (e.g. in .env.local).");
  process.exit(1);
}

const client = new pg.Client(getPgConfig(databaseUrl));
await client.connect();

async function upsertForTenant(tid) {
  for (const a of articles) {
    const exists = await client.query(
      `SELECT id FROM public.revision_articles WHERE tenant_id = $1::uuid AND article_code = $2`,
      [tid, a.article_code],
    );

    if (exists.rows.length) {
      await client.query(
        `UPDATE public.revision_articles
         SET title = $3,
             description = $4,
             default_cost_try = COALESCE($5, default_cost_try),
             ticket_tier = $6,
             updated_at = now()
         WHERE tenant_id = $1::uuid AND article_code = $2`,
        [tid, a.article_code, a.title, a.description, a.default_cost_try, a.ticket_tier],
      );
      console.log(`[${tid}] Updated ${a.article_code}`);
    } else {
      const max = await client.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS m FROM public.revision_articles WHERE tenant_id = $1::uuid`,
        [tid],
      );
      const sort_order = Number(max.rows[0].m) + 1;
      await client.query(
        `INSERT INTO public.revision_articles (tenant_id, sort_order, article_code, title, description, default_cost_try, ticket_tier)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
        [tid, sort_order, a.article_code, a.title, a.description, a.default_cost_try, a.ticket_tier],
      );
      console.log(`[${tid}] Inserted ${a.article_code} (sort_order ${sort_order})`);
    }
  }
}

try {
  let tenantIds = [];
  if (allTenants) {
    const r = await client.query(`SELECT id FROM public.tenants ORDER BY created_at ASC`);
    tenantIds = r.rows.map((x) => x.id);
    if (!tenantIds.length) {
      console.error("No rows in public.tenants.");
      process.exit(1);
    }
    console.log(`Prepared ${articles.length} article(s) for ${tenantIds.length} tenant(s).`);
  } else {
    const t = await client.query(`SELECT id FROM public.tenants WHERE id = $1::uuid`, [tenantId]);
    if (!t.rows.length) {
      console.error("No tenant with this TENANT_ID.");
      process.exit(1);
    }
    tenantIds = [tenantId];
    console.log(`Prepared ${articles.length} article(s) for tenant ${tenantId}.`);
  }

  await client.query("BEGIN");
  for (const tid of tenantIds) {
    await upsertForTenant(tid);
  }
  await client.query("COMMIT");
  console.log("Done.");
} catch (e) {
  await client.query("ROLLBACK");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end();
}
