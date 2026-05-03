import { isSupabaseConfigured } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";
import { getPool } from "@/lib/db/pool";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrentAccountRow = {
  customer_id: string;
  legal_name: string;
  code: string | null;
  site_count: number;
  asset_count: number;
  outstanding: string;
  currency: string;
};

export type ScopeOutstandingRow = {
  scopeKind: "site" | "asset";
  scope_id: string;
  label: string;
  outstanding: string;
  currency: string;
};

export type PendingReceivableRow = {
  id: string;
  occurred_on: string;
  entry_type: string;
  amount: string;
  currency: string;
  label: string;
  payment_status: string;
  customer_id: string | null;
  customer_name: string | null;
  scope_label: string;
};

export type ProfitLossCurrencyRow = {
  currency: string;
  revenue: string;
  expenses: string;
  net: string;
};

function monthStart(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function defaultProfitLossRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: monthStart(start),
    to: end.toISOString().slice(0, 10),
  };
}

export async function listCurrentAccounts(tenantId: string): Promise<CurrentAccountRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: custs } = await supabase
      .from("customers")
      .select("id, legal_name, code")
      .eq("tenant_id", tenantId)
      .order("legal_name", { ascending: true });
    if (!custs?.length) return [];

    const { data: sites } = await supabase.from("sites").select("id, customer_id").eq("tenant_id", tenantId);
    const { data: assets } = await supabase.from("elevator_assets").select("id, customer_id").eq("tenant_id", tenantId);
    const siteByCust = new Map<string, number>();
    const assetByCust = new Map<string, number>();
    for (const s of sites ?? []) {
      const k = String((s as { customer_id?: string }).customer_id ?? "");
      if (!k) continue;
      siteByCust.set(k, (siteByCust.get(k) ?? 0) + 1);
    }
    for (const a of assets ?? []) {
      const k = String((a as { customer_id?: string }).customer_id ?? "");
      if (!k) continue;
      assetByCust.set(k, (assetByCust.get(k) ?? 0) + 1);
    }

    const { data: fe } = await supabase
      .from("finance_entries")
      .select("customer_id, currency, amount, payment_status, entry_type")
      .eq("tenant_id", tenantId)
      .not("customer_id", "is", null);

    type Line = {
      customer_id: string;
      currency: string;
      amount: number;
      payment_status: string;
      entry_type: string;
    };
    const lines = (fe ?? []) as Line[];
    const outstandingMap = new Map<string, { currency: string; sum: number }>();
    for (const row of lines) {
      const cid = row.customer_id;
      if (!cid) continue;
      if (row.payment_status !== "unpaid") continue;
      if (!["invoice", "fee", "credit_note"].includes(row.entry_type)) continue;
      const amt = Number(row.amount);
      if (!Number.isFinite(amt)) continue;
      const signed =
        row.entry_type === "credit_note" ? -Math.abs(amt) : Math.abs(amt);
      const key = `${cid}::${row.currency || "TRY"}`;
      const cur = row.currency?.trim() || "TRY";
      const prev = outstandingMap.get(key);
      outstandingMap.set(key, {
        currency: cur,
        sum: (prev?.sum ?? 0) + signed,
      });
    }

    const rows: CurrentAccountRow[] = [];
    for (const c of custs as { id: string; legal_name: string; code: string | null }[]) {
      const cid = String(c.id);
      let outstanding = 0;
      let currency = "TRY";
      for (const [key, v] of outstandingMap) {
        if (key.startsWith(`${cid}::`)) {
          outstanding += v.sum;
          currency = v.currency;
        }
      }
      rows.push({
        customer_id: cid,
        legal_name: c.legal_name,
        code: c.code,
        site_count: siteByCust.get(cid) ?? 0,
        asset_count: assetByCust.get(cid) ?? 0,
        outstanding: outstanding.toFixed(2),
        currency,
      });
    }
    return rows;
  }

  const pool = getPool();
  const { rows } = await pool.query<CurrentAccountRow>(
    `WITH cust AS (
       SELECT c.id AS customer_id, c.legal_name, c.code
       FROM customers c
       WHERE c.tenant_id = $1
     ),
     sc AS (
       SELECT s.customer_id, count(*)::int AS site_count
       FROM sites s
       WHERE s.tenant_id = $1
       GROUP BY s.customer_id
     ),
     ac AS (
       SELECT ea.customer_id, count(*)::int AS asset_count
       FROM elevator_assets ea
       WHERE ea.tenant_id = $1
       GROUP BY ea.customer_id
     )
     SELECT cust.customer_id,
            cust.legal_name,
            cust.code,
            COALESCE(sc.site_count, 0)::int AS site_count,
            COALESCE(ac.asset_count, 0)::int AS asset_count,
            COALESCE(rx.outstanding, 0)::text AS outstanding,
            COALESCE(rx.currency, 'TRY') AS currency
     FROM cust
     LEFT JOIN sc ON sc.customer_id = cust.customer_id
     LEFT JOIN ac ON ac.customer_id = cust.customer_id
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(SUM(
           CASE
             WHEN fe.entry_type = 'credit_note' THEN -(ABS(fe.amount::numeric))
             ELSE ABS(fe.amount::numeric)
           END
         ), 0)::text AS outstanding,
         MAX(fe.currency) AS currency
       FROM finance_entries fe
       WHERE fe.tenant_id = $1
         AND fe.customer_id = cust.customer_id
         AND fe.payment_status = 'unpaid'
         AND fe.entry_type IN ('invoice', 'fee', 'credit_note')
     ) rx ON true
     ORDER BY cust.legal_name ASC`,
    [tenantId],
  );
  return rows;
}

export async function listScopeOutstandingForCustomer(
  tenantId: string,
  customerId: string,
): Promise<ScopeOutstandingRow[]> {
  const pool = getPool();
  const { rows: sites } = await pool.query<{
    scope_id: string;
    label: string;
    outstanding: string;
    currency: string;
  }>(
    `SELECT s.id::text AS scope_id,
            s.name AS label,
            COALESCE(SUM(
              CASE
                WHEN fe.payment_status = 'unpaid' AND fe.entry_type IN ('invoice', 'fee')
                  THEN ABS(fe.amount::numeric)
                WHEN fe.payment_status = 'unpaid' AND fe.entry_type = 'credit_note'
                  THEN -(ABS(fe.amount::numeric))
                ELSE 0::numeric
              END
            ), 0)::text AS outstanding,
            COALESCE(MAX(fe.currency), 'TRY') AS currency
     FROM sites s
     LEFT JOIN finance_entries fe ON fe.site_id = s.id AND fe.tenant_id = s.tenant_id
     WHERE s.tenant_id = $1 AND s.customer_id = $2::uuid
     GROUP BY s.id, s.name
     ORDER BY s.name ASC`,
    [tenantId, customerId],
  );

  const { rows: assets } = await pool.query<{
    scope_id: string;
    label: string;
    outstanding: string;
    currency: string;
  }>(
    `SELECT ea.id::text AS scope_id,
            ea.unit_code || ' · ' || COALESCE(st.name, '') AS label,
            COALESCE(SUM(
              CASE
                WHEN fe.payment_status = 'unpaid' AND fe.entry_type IN ('invoice', 'fee')
                  THEN ABS(fe.amount::numeric)
                WHEN fe.payment_status = 'unpaid' AND fe.entry_type = 'credit_note'
                  THEN -(ABS(fe.amount::numeric))
                ELSE 0::numeric
              END
            ), 0)::text AS outstanding,
            COALESCE(MAX(fe.currency), 'TRY') AS currency
     FROM elevator_assets ea
     INNER JOIN sites st ON st.id = ea.site_id AND st.tenant_id = ea.tenant_id
     LEFT JOIN finance_entries fe ON fe.elevator_asset_id = ea.id AND fe.tenant_id = ea.tenant_id
     WHERE ea.tenant_id = $1 AND ea.customer_id = $2::uuid
     GROUP BY ea.id, ea.unit_code, st.name
     ORDER BY st.name ASC, ea.unit_code ASC`,
    [tenantId, customerId],
  );

  const out: ScopeOutstandingRow[] = [];
  for (const r of sites) {
    out.push({
      scopeKind: "site",
      scope_id: r.scope_id,
      label: r.label,
      outstanding: r.outstanding,
      currency: r.currency,
    });
  }
  for (const r of assets) {
    out.push({
      scopeKind: "asset",
      scope_id: r.scope_id,
      label: r.label,
      outstanding: r.outstanding,
      currency: r.currency,
    });
  }
  return out;
}

export async function listPendingReceivables(tenantId: string): Promise<PendingReceivableRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: fe } = await supabase
      .from("finance_entries")
      .select(
        "id, occurred_on, entry_type, amount, currency, label, payment_status, customer_id, site_id, elevator_asset_id",
      )
      .eq("tenant_id", tenantId)
      .eq("payment_status", "unpaid")
      .in("entry_type", ["invoice", "fee"])
      .order("occurred_on", { ascending: false })
      .limit(500);
    if (!fe?.length) return [];
    const rows = fe as PendingReceivableRowRaw[];
    return await hydrateReceivableRows(supabase, tenantId, rows);
  }

  const pool = getPool();
  const { rows } = await pool.query<PendingReceivableRow>(
    `SELECT fe.id::text,
            fe.occurred_on::text AS occurred_on,
            fe.entry_type,
            fe.amount::text,
            fe.currency,
            fe.label,
            fe.payment_status,
            fe.customer_id::text,
            c.legal_name AS customer_name,
            CASE
              WHEN fe.site_id IS NOT NULL THEN COALESCE(s.name, 'Site')
              WHEN fe.elevator_asset_id IS NOT NULL THEN
                COALESCE(ea.unit_code, 'Ünite') || ' · ' || COALESCE(sa.name, 'Site')
              ELSE '—'
            END AS scope_label
     FROM finance_entries fe
     LEFT JOIN customers c ON c.id = fe.customer_id AND c.tenant_id = fe.tenant_id
     LEFT JOIN sites s ON s.id = fe.site_id AND s.tenant_id = fe.tenant_id
     LEFT JOIN elevator_assets ea ON ea.id = fe.elevator_asset_id AND ea.tenant_id = fe.tenant_id
     LEFT JOIN sites sa ON sa.id = ea.site_id AND sa.tenant_id = ea.tenant_id
     WHERE fe.tenant_id = $1
       AND fe.payment_status = 'unpaid'
       AND fe.entry_type IN ('invoice', 'fee')
     ORDER BY fe.occurred_on DESC
     LIMIT 500`,
    [tenantId],
  );
  return rows;
}

type PendingReceivableRowRaw = {
  id: string;
  occurred_on: string;
  entry_type: string;
  amount: string | number;
  currency: string;
  label: string;
  payment_status: string;
  customer_id: string | null;
  site_id: string | null;
  elevator_asset_id: string | null;
};

async function hydrateReceivableRows(
  supabase: SupabaseClient,
  tenantId: string,
  rows: PendingReceivableRowRaw[],
): Promise<PendingReceivableRow[]> {
  if (!rows.length) return [];
  const custIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];
  const siteIds = [...new Set(rows.map((r) => r.site_id).filter(Boolean))] as string[];
  const assetIds = [...new Set(rows.map((r) => r.elevator_asset_id).filter(Boolean))] as string[];
  const custMap = new Map<string, string>();
  const siteMap = new Map<string, string>();
  const assetMap = new Map<string, { unit_code: string; site_id: string }>();
  if (custIds.length) {
    const { data } = await supabase.from("customers").select("id, legal_name").eq("tenant_id", tenantId).in("id", custIds);
    for (const c of data ?? []) custMap.set(String(c.id), String((c as { legal_name?: string }).legal_name ?? "—"));
  }
  if (siteIds.length) {
    const { data } = await supabase.from("sites").select("id, name").eq("tenant_id", tenantId).in("id", siteIds);
    for (const s of data ?? []) siteMap.set(String(s.id), String((s as { name?: string }).name ?? "Site"));
  }
  if (assetIds.length) {
    const { data } = await supabase
      .from("elevator_assets")
      .select("id, unit_code, site_id")
      .eq("tenant_id", tenantId)
      .in("id", assetIds);
    for (const a of data ?? []) {
      assetMap.set(String(a.id), {
        unit_code: String((a as { unit_code?: string }).unit_code ?? "Ünite"),
        site_id: String((a as { site_id?: string }).site_id ?? ""),
      });
    }
  }
  const extraSites = [...new Set([...assetMap.values()].map((a) => a.site_id).filter(Boolean))].filter(
    (id) => !siteMap.has(id),
  );
  if (extraSites.length) {
    const { data } = await supabase.from("sites").select("id, name").eq("tenant_id", tenantId).in("id", extraSites);
    for (const s of data ?? []) siteMap.set(String(s.id), String((s as { name?: string }).name ?? "Site"));
  }

  return rows.map((r) => {
    let scope_label = "—";
    if (r.site_id) scope_label = siteMap.get(r.site_id) ?? "Site";
    else if (r.elevator_asset_id) {
      const a = assetMap.get(r.elevator_asset_id);
      const u = a?.unit_code ?? "Ünite";
      const sn = a?.site_id ? (siteMap.get(a.site_id) ?? "Site") : "Site";
      scope_label = `${u} · ${sn}`;
    }
    const cid = r.customer_id ?? null;
    return {
      id: r.id,
      occurred_on: String(r.occurred_on ?? "").slice(0, 10),
      entry_type: r.entry_type,
      amount: String(r.amount ?? ""),
      currency: r.currency,
      label: r.label,
      payment_status: r.payment_status,
      customer_id: cid,
      customer_name: cid ? (custMap.get(cid) ?? null) : null,
      scope_label,
    };
  });
}

export async function getProfitLossByCurrency(
  tenantId: string,
  from: string,
  to: string,
): Promise<ProfitLossCurrencyRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: fe } = await supabase
      .from("finance_entries")
      .select("entry_type, amount, currency, occurred_on")
      .eq("tenant_id", tenantId)
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .limit(5000);
    const byCur = new Map<string, { revenue: number; expenses: number }>();
    for (const row of fe ?? []) {
      const cur = String((row as { currency?: string }).currency ?? "TRY").trim() || "TRY";
      const amt = Number((row as { amount?: number }).amount);
      if (!Number.isFinite(amt)) continue;
      const ot = String((row as { occurred_on?: string }).occurred_on ?? "");
      if (ot.slice(0, 10) < from || ot.slice(0, 10) > to) continue;
      const ent = byCur.get(cur) ?? { revenue: 0, expenses: 0 };
      const t = String((row as { entry_type?: string }).entry_type ?? "");
      if (t === "invoice" || t === "fee") ent.revenue += Math.abs(amt);
      else if (t === "expense") ent.expenses += Math.abs(amt);
      byCur.set(cur, ent);
    }
    return [...byCur.entries()]
      .map(([currency, v]) => ({
        currency,
        revenue: v.revenue.toFixed(2),
        expenses: v.expenses.toFixed(2),
        net: (v.revenue - v.expenses).toFixed(2),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  const pool = getPool();
  const { rows } = await pool.query<{ currency: string; revenue: string; expenses: string; net: string }>(
    `SELECT currency,
            COALESCE(SUM(CASE WHEN entry_type IN ('invoice', 'fee') THEN ABS(amount::numeric) ELSE 0 END), 0)::text AS revenue,
            COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN ABS(amount::numeric) ELSE 0 END), 0)::text AS expenses,
            COALESCE(SUM(
              CASE
                WHEN entry_type IN ('invoice', 'fee') THEN ABS(amount::numeric)
                WHEN entry_type = 'expense' THEN -ABS(amount::numeric)
                ELSE 0::numeric
              END
            ), 0)::text AS net
     FROM finance_entries
     WHERE tenant_id = $1
       AND occurred_on BETWEEN $2::date AND $3::date
     GROUP BY currency
     ORDER BY currency ASC`,
    [tenantId, from, to],
  );
  return rows;
}
