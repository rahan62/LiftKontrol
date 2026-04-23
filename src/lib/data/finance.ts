import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FinanceEntryRow = {
  id: string;
  site_id: string | null;
  elevator_asset_id: string | null;
  entry_type: string;
  amount: string;
  currency: string;
  label: string;
  notes: string | null;
  occurred_on: string;
  created_at: string;
  payment_status: string;
  scope_label: string;
};

const baseFrom = `
  FROM finance_entries fe
  LEFT JOIN sites s ON s.id = fe.site_id AND s.tenant_id = fe.tenant_id
  LEFT JOIN elevator_assets ea ON ea.id = fe.elevator_asset_id AND ea.tenant_id = fe.tenant_id
  LEFT JOIN sites sa ON sa.id = ea.site_id AND sa.tenant_id = fe.tenant_id
`;

const selectCols = `
  SELECT fe.id,
         fe.site_id,
         fe.elevator_asset_id,
         fe.entry_type,
         fe.amount::text AS amount,
         fe.currency,
         fe.label,
         fe.notes,
         fe.occurred_on::text AS occurred_on,
         fe.created_at::text AS created_at,
         fe.payment_status,
         CASE
           WHEN fe.site_id IS NOT NULL THEN COALESCE(s.name, 'Site')
           WHEN fe.elevator_asset_id IS NOT NULL THEN
             COALESCE(ea.unit_code, 'Unit') || ' · ' || COALESCE(sa.name, 'Site')
           ELSE '—'
         END AS scope_label
`;

export async function listFinanceEntries(tenantId: string): Promise<FinanceEntryRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: fe } = await supabase
      .from("finance_entries")
      .select(
        "id, site_id, elevator_asset_id, entry_type, amount, currency, label, notes, occurred_on, created_at, payment_status",
      )
      .eq("tenant_id", tenantId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (!fe?.length) return [];
    return await hydrateFinanceScopeLabels(supabase, tenantId, fe as FinanceEntryRowRaw[]);
  }
  const pool = getPool();
  const { rows } = await pool.query<FinanceEntryRow>(
    `${selectCols} ${baseFrom} WHERE fe.tenant_id = $1 ORDER BY fe.occurred_on DESC, fe.created_at DESC`,
    [tenantId],
  );
  return rows;
}

type FinanceEntryRowRaw = {
  id: string;
  site_id: string | null;
  elevator_asset_id: string | null;
  entry_type: string;
  amount: string | number;
  currency: string;
  label: string;
  notes: string | null;
  occurred_on: string;
  created_at: string;
  payment_status: string;
};

async function hydrateFinanceScopeLabels(
  supabase: SupabaseClient,
  tenantId: string,
  rows: FinanceEntryRowRaw[],
): Promise<FinanceEntryRow[]> {
  const siteIds = [...new Set(rows.map((r) => r.site_id).filter(Boolean))] as string[];
  const assetIds = [...new Set(rows.map((r) => r.elevator_asset_id).filter(Boolean))] as string[];
  const siteMap = new Map<string, { name: string }>();
  const assetMap = new Map<string, { unit_code: string; site_id: string }>();
  if (siteIds.length) {
    const { data: sites } = await supabase
      .from("sites")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("id", siteIds);
    for (const s of sites ?? []) {
      siteMap.set(String(s.id), { name: String(s.name ?? "Site") });
    }
  }
  if (assetIds.length) {
    const { data: assets } = await supabase
      .from("elevator_assets")
      .select("id, unit_code, site_id")
      .eq("tenant_id", tenantId)
      .in("id", assetIds);
    for (const a of assets ?? []) {
      assetMap.set(String(a.id), { unit_code: String(a.unit_code ?? "Unit"), site_id: String(a.site_id ?? "") });
    }
  }
  const extraSiteIds = [...new Set([...assetMap.values()].map((a) => a.site_id).filter(Boolean))].filter(
    (id) => !siteMap.has(id),
  );
  if (extraSiteIds.length) {
    const { data: sites2 } = await supabase
      .from("sites")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("id", extraSiteIds);
    for (const s of sites2 ?? []) {
      siteMap.set(String(s.id), { name: String(s.name ?? "Site") });
    }
  }
  return rows.map((r) => {
    let scope_label = "—";
    if (r.site_id) {
      scope_label = siteMap.get(r.site_id)?.name ?? "Site";
    } else if (r.elevator_asset_id) {
      const a = assetMap.get(r.elevator_asset_id);
      const unit = a?.unit_code ?? "Unit";
      const sname = a?.site_id ? (siteMap.get(a.site_id)?.name ?? "Site") : "Site";
      scope_label = `${unit} · ${sname}`;
    }
    return {
      id: r.id,
      site_id: r.site_id,
      elevator_asset_id: r.elevator_asset_id,
      entry_type: r.entry_type,
      amount: String(r.amount ?? ""),
      currency: r.currency,
      label: r.label,
      notes: r.notes,
      occurred_on: String(r.occurred_on ?? "").slice(0, 10),
      created_at: String(r.created_at ?? ""),
      payment_status: r.payment_status,
      scope_label,
    };
  });
}

export async function listFinanceEntriesForSite(
  tenantId: string,
  siteId: string,
): Promise<FinanceEntryRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: fe } = await supabase
      .from("finance_entries")
      .select(
        "id, site_id, elevator_asset_id, entry_type, amount, currency, label, notes, occurred_on, created_at, payment_status",
      )
      .eq("tenant_id", tenantId)
      .eq("site_id", siteId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (!fe?.length) return [];
    return await hydrateFinanceScopeLabels(supabase, tenantId, fe as FinanceEntryRowRaw[]);
  }
  const pool = getPool();
  const { rows } = await pool.query<FinanceEntryRow>(
    `${selectCols} ${baseFrom} WHERE fe.tenant_id = $1 AND fe.site_id = $2 ORDER BY fe.occurred_on DESC, fe.created_at DESC`,
    [tenantId, siteId],
  );
  return rows;
}

export async function listFinanceEntriesForAsset(
  tenantId: string,
  assetId: string,
): Promise<FinanceEntryRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: fe } = await supabase
      .from("finance_entries")
      .select(
        "id, site_id, elevator_asset_id, entry_type, amount, currency, label, notes, occurred_on, created_at, payment_status",
      )
      .eq("tenant_id", tenantId)
      .eq("elevator_asset_id", assetId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (!fe?.length) return [];
    return await hydrateFinanceScopeLabels(supabase, tenantId, fe as FinanceEntryRowRaw[]);
  }
  const pool = getPool();
  const { rows } = await pool.query<FinanceEntryRow>(
    `${selectCols} ${baseFrom} WHERE fe.tenant_id = $1 AND fe.elevator_asset_id = $2 ORDER BY fe.occurred_on DESC, fe.created_at DESC`,
    [tenantId, assetId],
  );
  return rows;
}
