import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { canonicalElevatorUrl } from "@/lib/elevator-qr";

async function persistElevatorQrPayload(tenantId: string, assetId: string): Promise<void> {
  const url = canonicalElevatorUrl(assetId);
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return;
    await supabase.from("elevator_assets").update({ qr_payload: url }).eq("tenant_id", tenantId).eq("id", assetId);
    return;
  }
  const pool = getPool();
  await pool.query(`UPDATE elevator_assets SET qr_payload = $1 WHERE tenant_id = $2 AND id = $3`, [
    url,
    tenantId,
    assetId,
  ]);
}

export type CustomerInput = {
  legal_name: string;
  code?: string | null;
  status: string;
  notes?: string | null;
  billing_address?: Record<string, unknown> | null;
};

export type SiteInput = {
  customer_id: string;
  name: string;
  service_address: Record<string, unknown>;
  billing_same_as_service: boolean;
  access_instructions?: string | null;
  machine_room_notes?: string | null;
  shaft_notes?: string | null;
  emergency_phones?: string | null;
  maintenance_fee?: number | null;
  maintenance_fee_period?: string | null;
  maintenance_notes?: string | null;
  /** Konum: rota / Apple Maps için { lat, lng } */
  geo?: Record<string, unknown> | null;
};

export type FinanceEntryInput = {
  site_id?: string | null;
  elevator_asset_id?: string | null;
  entry_type: string;
  amount: number;
  currency: string;
  label: string;
  notes?: string | null;
  occurred_on: string;
  payment_status?: "unpaid" | "paid";
};

export type AssetInput = {
  customer_id: string;
  site_id: string;
  unit_code: string;
  elevator_type: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  controller_type?: string | null;
  drive_type?: string | null;
  door_type?: string | null;
  stops?: number | null;
  capacity_kg?: number | null;
  persons?: number | null;
  speed?: number | null;
  operational_status: string;
  unsafe_flag: boolean;
  /** EN 81-20 periodic control: government body vs private accredited control company. */
  en8120_control_authority?: "government" | "private_control_company" | null;
  private_control_company_name?: string | null;
  en8120_next_control_due?: string | null;
  /** How this maintainer took over the unit. */
  maintenance_transfer_basis?: "direct_after_prior_expiry" | "after_annual_en8120" | null;
  /** Per-unit periodic maintenance fee (see `maintenance_fee_period`). */
  maintenance_fee?: number | null;
  /** `monthly` or `yearly`; null if no periodic fee. */
  maintenance_fee_period?: string | null;
};

function err(msg: string): { ok: false; error: string } {
  return { ok: false, error: msg };
}

export async function insertCustomer(
  tenantId: string,
  input: CustomerInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const row = {
    tenant_id: tenantId,
    legal_name: input.legal_name.trim(),
    code: input.code?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
    billing_address: input.billing_address ?? null,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { data, error } = await supabase.from("customers").insert(row).select("id").single();
    if (error) return err(error.message);
    if (!data?.id) return err("No id returned");
    return { ok: true, id: data.id };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO customers (tenant_id, legal_name, code, status, notes, billing_address)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id`,
    [
      tenantId,
      row.legal_name,
      row.code,
      row.status,
      row.notes,
      JSON.stringify(row.billing_address ?? {}),
    ],
  );
  if (!rows[0]) return err("Insert failed");
  return { ok: true, id: rows[0].id };
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  input: CustomerInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = {
    legal_name: input.legal_name.trim(),
    code: input.code?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
    billing_address: input.billing_address ?? null,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { error } = await supabase
      .from("customers")
      .update(row)
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return err(error.message);
    return { ok: true };
  }

  const pool = getPool();
  const r = await pool.query(
    `UPDATE customers SET legal_name = $1, code = $2, status = $3, notes = $4, billing_address = $5::jsonb
     WHERE tenant_id = $6 AND id = $7`,
    [
      row.legal_name,
      row.code,
      row.status,
      row.notes,
      JSON.stringify(row.billing_address ?? {}),
      tenantId,
      id,
    ],
  );
  if (r.rowCount === 0) return err("Not found or access denied");
  return { ok: true };
}

export async function deleteCustomer(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  /** Prefer direct SQL so FK order is handled by Postgres CASCADE rules. */
  try {
    const pool = getPool();
    const del = await pool.query(`DELETE FROM customers WHERE tenant_id = $1 AND id = $2`, [
      tenantId,
      id,
    ]);
    if (del.rowCount === 0) return err("Not found");
    return { ok: true };
  } catch (e) {
    return err(
      e instanceof Error
        ? e.message
        : "Silinemedi (bağlı kayıtlar varsa önce onları kaldırın).",
    );
  }
}

export async function assertCustomerBelongsToTenant(
  tenantId: string,
  customerId: string,
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", customerId)
      .maybeSingle();
    return Boolean(data);
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT 1 FROM customers WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    customerId,
  ]);
  return rows.length > 0;
}

export async function insertSite(
  tenantId: string,
  input: SiteInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const row = {
    tenant_id: tenantId,
    customer_id: input.customer_id,
    name: input.name.trim(),
    service_address: input.service_address,
    billing_same_as_service: input.billing_same_as_service,
    access_instructions: input.access_instructions?.trim() || null,
    machine_room_notes: input.machine_room_notes?.trim() || null,
    shaft_notes: input.shaft_notes?.trim() || null,
    emergency_phones: input.emergency_phones?.trim() || null,
    maintenance_fee: input.maintenance_fee ?? null,
    maintenance_fee_period: input.maintenance_fee_period?.trim() || null,
    maintenance_notes: input.maintenance_notes?.trim() || null,
    geo: input.geo && Object.keys(input.geo).length ? input.geo : null,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { data, error } = await supabase
      .from("sites")
      .insert({ ...row, floor_count: null, elevator_count: null })
      .select("id")
      .single();
    if (error) return err(error.message);
    if (!data?.id) return err("No id returned");
    return { ok: true, id: data.id };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO sites (tenant_id, customer_id, name, service_address, billing_same_as_service,
       access_instructions, machine_room_notes, shaft_notes, emergency_phones,
       floor_count, elevator_count, maintenance_fee, maintenance_fee_period, maintenance_notes, geo)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, NULL, NULL, $10, $11, $12, $13::jsonb)
     RETURNING id`,
    [
      tenantId,
      row.customer_id,
      row.name,
      JSON.stringify(row.service_address),
      row.billing_same_as_service,
      row.access_instructions,
      row.machine_room_notes,
      row.shaft_notes,
      row.emergency_phones,
      row.maintenance_fee,
      row.maintenance_fee_period,
      row.maintenance_notes,
      row.geo ? JSON.stringify(row.geo) : null,
    ],
  );
  if (!rows[0]) return err("Insert failed");
  return { ok: true, id: rows[0].id };
}

export async function updateSite(
  tenantId: string,
  id: string,
  input: SiteInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = {
    customer_id: input.customer_id,
    name: input.name.trim(),
    service_address: input.service_address,
    billing_same_as_service: input.billing_same_as_service,
    access_instructions: input.access_instructions?.trim() || null,
    machine_room_notes: input.machine_room_notes?.trim() || null,
    shaft_notes: input.shaft_notes?.trim() || null,
    emergency_phones: input.emergency_phones?.trim() || null,
    maintenance_fee: input.maintenance_fee ?? null,
    maintenance_fee_period: input.maintenance_fee_period?.trim() || null,
    maintenance_notes: input.maintenance_notes?.trim() || null,
    geo: input.geo && Object.keys(input.geo).length ? input.geo : null,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { error } = await supabase
      .from("sites")
      .update({ ...row, floor_count: null, elevator_count: null })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return err(error.message);
    return { ok: true };
  }

  const pool = getPool();
  const r = await pool.query(
    `UPDATE sites SET customer_id = $1, name = $2, service_address = $3::jsonb, billing_same_as_service = $4,
       access_instructions = $5, machine_room_notes = $6, shaft_notes = $7, emergency_phones = $8,
       floor_count = NULL, elevator_count = NULL,
       maintenance_fee = $9, maintenance_fee_period = $10, maintenance_notes = $11,
       geo = $12::jsonb
     WHERE tenant_id = $13 AND id = $14`,
    [
      row.customer_id,
      row.name,
      JSON.stringify(row.service_address),
      row.billing_same_as_service,
      row.access_instructions,
      row.machine_room_notes,
      row.shaft_notes,
      row.emergency_phones,
      row.maintenance_fee,
      row.maintenance_fee_period,
      row.maintenance_notes,
      row.geo ? JSON.stringify(row.geo) : null,
      tenantId,
      id,
    ],
  );
  if (r.rowCount === 0) return err("Not found");
  return { ok: true };
}

export async function deleteSite(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM elevator_assets WHERE tenant_id = $1 AND site_id = $2`, [
        tenantId,
        id,
      ]);
      const del = await client.query(`DELETE FROM sites WHERE tenant_id = $1 AND id = $2`, [
        tenantId,
        id,
      ]);
      if (del.rowCount === 0) {
        await client.query("ROLLBACK");
        return err("Not found");
      }
      await client.query("COMMIT");
      return { ok: true };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : "Silinemedi");
  }
}

export async function insertAsset(
  tenantId: string,
  input: AssetInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const row = {
    tenant_id: tenantId,
    customer_id: input.customer_id,
    site_id: input.site_id,
    unit_code: input.unit_code.trim(),
    elevator_type: input.elevator_type,
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    serial_number: input.serial_number?.trim() || null,
    controller_type: input.controller_type?.trim() || null,
    drive_type: input.drive_type?.trim() || null,
    door_type: input.door_type?.trim() || null,
    stops: input.stops ?? null,
    capacity_kg: input.capacity_kg ?? null,
    persons: input.persons ?? null,
    speed: input.speed ?? null,
    operational_status: input.operational_status,
    unsafe_flag: input.unsafe_flag,
    en8120_control_authority: input.en8120_control_authority ?? null,
    private_control_company_name: input.private_control_company_name?.trim() || null,
    en8120_next_control_due: input.en8120_next_control_due?.trim() || null,
    maintenance_transfer_basis: input.maintenance_transfer_basis ?? null,
    maintenance_fee: input.maintenance_fee ?? null,
    maintenance_fee_period: input.maintenance_fee_period?.trim() || null,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { data, error } = await supabase.from("elevator_assets").insert(row).select("id").single();
    if (error) return err(error.message);
    if (!data?.id) return err("No id returned");
    await persistElevatorQrPayload(tenantId, data.id);
    void import("@/lib/data/route-plans")
      .then((m) => m.recomputeTenantRouteClusters(tenantId))
      .catch(() => {});
    return { ok: true, id: data.id };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO elevator_assets (
       tenant_id, customer_id, site_id, unit_code, elevator_type, brand, model, serial_number,
       controller_type, drive_type, door_type, stops, capacity_kg, persons, speed,
       operational_status, unsafe_flag,
       en8120_control_authority, private_control_company_name, en8120_next_control_due, maintenance_transfer_basis,
       maintenance_fee, maintenance_fee_period
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
       $18, $19, $20::date, $21, $22, $23
     ) RETURNING id`,
    [
      tenantId,
      row.customer_id,
      row.site_id,
      row.unit_code,
      row.elevator_type,
      row.brand,
      row.model,
      row.serial_number,
      row.controller_type,
      row.drive_type,
      row.door_type,
      row.stops,
      row.capacity_kg,
      row.persons,
      row.speed,
      row.operational_status,
      row.unsafe_flag,
      row.en8120_control_authority,
      row.private_control_company_name,
      row.en8120_next_control_due || null,
      row.maintenance_transfer_basis,
      row.maintenance_fee,
      row.maintenance_fee_period,
    ],
  );
  if (!rows[0]) return err("Insert failed");
  await persistElevatorQrPayload(tenantId, rows[0].id);
  void import("@/lib/data/route-plans")
    .then((m) => m.recomputeTenantRouteClusters(tenantId))
    .catch(() => {});
  return { ok: true, id: rows[0].id };
}

export async function updateAsset(
  tenantId: string,
  id: string,
  input: AssetInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = {
    customer_id: input.customer_id,
    site_id: input.site_id,
    unit_code: input.unit_code.trim(),
    elevator_type: input.elevator_type,
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    serial_number: input.serial_number?.trim() || null,
    controller_type: input.controller_type?.trim() || null,
    drive_type: input.drive_type?.trim() || null,
    door_type: input.door_type?.trim() || null,
    stops: input.stops ?? null,
    capacity_kg: input.capacity_kg ?? null,
    persons: input.persons ?? null,
    speed: input.speed ?? null,
    operational_status: input.operational_status,
    unsafe_flag: input.unsafe_flag,
    en8120_control_authority: input.en8120_control_authority ?? null,
    private_control_company_name: input.private_control_company_name?.trim() || null,
    en8120_next_control_due: input.en8120_next_control_due?.trim() || null,
    maintenance_transfer_basis: input.maintenance_transfer_basis ?? null,
    maintenance_fee: input.maintenance_fee ?? null,
    maintenance_fee_period: input.maintenance_fee_period?.trim() || null,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { error } = await supabase
      .from("elevator_assets")
      .update(row)
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return err(error.message);
    await persistElevatorQrPayload(tenantId, id);
    void import("@/lib/data/route-plans")
      .then((m) => m.recomputeTenantRouteClusters(tenantId))
      .catch(() => {});
    return { ok: true };
  }

  const pool = getPool();
  const r = await pool.query(
    `UPDATE elevator_assets SET
       customer_id = $1, site_id = $2, unit_code = $3, elevator_type = $4,
       brand = $5, model = $6, serial_number = $7, controller_type = $8, drive_type = $9, door_type = $10,
       stops = $11, capacity_kg = $12, persons = $13, speed = $14,
       operational_status = $15, unsafe_flag = $16,
       en8120_control_authority = $17, private_control_company_name = $18, en8120_next_control_due = $19::date,
       maintenance_transfer_basis = $20,
       maintenance_fee = $21, maintenance_fee_period = $22
     WHERE tenant_id = $23 AND id = $24`,
    [
      row.customer_id,
      row.site_id,
      row.unit_code,
      row.elevator_type,
      row.brand,
      row.model,
      row.serial_number,
      row.controller_type,
      row.drive_type,
      row.door_type,
      row.stops,
      row.capacity_kg,
      row.persons,
      row.speed,
      row.operational_status,
      row.unsafe_flag,
      row.en8120_control_authority,
      row.private_control_company_name,
      row.en8120_next_control_due || null,
      row.maintenance_transfer_basis,
      row.maintenance_fee,
      row.maintenance_fee_period,
      tenantId,
      id,
    ],
  );
  if (r.rowCount === 0) return err("Not found");
  await persistElevatorQrPayload(tenantId, id);
  void import("@/lib/data/route-plans")
    .then((m) => m.recomputeTenantRouteClusters(tenantId))
    .catch(() => {});
  return { ok: true };
}

export async function deleteAsset(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const pool = getPool();
    const r = await pool.query(`DELETE FROM elevator_assets WHERE tenant_id = $1 AND id = $2`, [
      tenantId,
      id,
    ]);
    if (r.rowCount === 0) return err("Not found");
    return { ok: true };
  } catch (e) {
    return err(e instanceof Error ? e.message : "Silinemedi");
  }
}

/** Ensure site belongs to tenant and customer_id matches site (for asset integrity). */
export async function verifySiteForTenant(
  tenantId: string,
  siteId: string,
  expectedCustomerId: string,
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("sites")
      .select("id, customer_id")
      .eq("tenant_id", tenantId)
      .eq("id", siteId)
      .maybeSingle();
    return Boolean(data && data.customer_id === expectedCustomerId);
  }
  const pool = getPool();
  const { rows } = await pool.query<{ customer_id: string }>(
    `SELECT customer_id FROM sites WHERE tenant_id = $1 AND id = $2`,
    [tenantId, siteId],
  );
  return rows[0]?.customer_id === expectedCustomerId;
}

export async function siteBelongsToTenant(tenantId: string, siteId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("sites")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", siteId)
      .maybeSingle();
    return Boolean(data);
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT 1 FROM sites WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    siteId,
  ]);
  return rows.length > 0;
}

export async function elevatorAssetBelongsToTenant(
  tenantId: string,
  assetId: string,
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("elevator_assets")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", assetId)
      .maybeSingle();
    return Boolean(data);
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT 1 FROM elevator_assets WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    assetId,
  ]);
  return rows.length > 0;
}

export async function insertFinanceEntry(
  tenantId: string,
  input: FinanceEntryInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const hasSite = Boolean(input.site_id && !input.elevator_asset_id);
  const hasAsset = Boolean(input.elevator_asset_id && !input.site_id);
  if (!hasSite && !hasAsset) {
    return err("Choose either a site or an elevator");
  }
  if (hasSite && input.site_id) {
    const ok = await siteBelongsToTenant(tenantId, input.site_id);
    if (!ok) return err("Invalid site");
  }
  if (hasAsset && input.elevator_asset_id) {
    const ok = await elevatorAssetBelongsToTenant(tenantId, input.elevator_asset_id);
    if (!ok) return err("Invalid elevator");
  }

  const row = {
    tenant_id: tenantId,
    site_id: hasSite ? input.site_id! : null,
    elevator_asset_id: hasAsset ? input.elevator_asset_id! : null,
    entry_type: input.entry_type,
    amount: input.amount,
    currency: input.currency.trim() || "TRY",
    label: input.label.trim(),
    notes: input.notes?.trim() || null,
    occurred_on: input.occurred_on,
    payment_status: input.payment_status ?? "unpaid",
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { data, error } = await supabase.from("finance_entries").insert(row).select("id").single();
    if (error) return err(error.message);
    if (!data?.id) return err("No id returned");
    return { ok: true, id: data.id };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO finance_entries (
       tenant_id, site_id, elevator_asset_id, entry_type, amount, currency, label, notes, occurred_on, payment_status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10)
     RETURNING id`,
    [
      tenantId,
      row.site_id,
      row.elevator_asset_id,
      row.entry_type,
      row.amount,
      row.currency,
      row.label,
      row.notes,
      row.occurred_on,
      row.payment_status,
    ],
  );
  if (!rows[0]) return err("Insert failed");
  return { ok: true, id: rows[0].id };
}

export async function setFinanceEntryPaid(
  tenantId: string,
  id: string,
  paid: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = paid ? "paid" : "unpaid";
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { error } = await supabase
      .from("finance_entries")
      .update({ payment_status: status })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return err(error.message);
    return { ok: true };
  }
  const pool = getPool();
  const r = await pool.query(
    `UPDATE finance_entries SET payment_status = $1 WHERE tenant_id = $2 AND id = $3`,
    [status, tenantId, id],
  );
  if (r.rowCount === 0) return err("Not found");
  return { ok: true };
}

export type WorkOrderInsertInput = {
  number: string;
  work_type: string;
  priority?: string;
  status?: string;
  source?: string;
  customer_id: string | null;
  site_id: string | null;
  elevator_asset_id: string | null;
  fault_symptom: string | null;
  is_emergency?: boolean;
  /** Aylık programı duraklatan saha ekibi (opsiyonel). */
  blocking_crew_id?: string | null;
};

export async function insertWorkOrder(
  tenantId: string,
  input: WorkOrderInsertInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const row = {
    tenant_id: tenantId,
    number: input.number.trim(),
    work_type: input.work_type.trim(),
    priority: input.priority?.trim() || "normal",
    status: input.status?.trim() || "open",
    source: input.source?.trim() || "internal",
    customer_id: input.customer_id,
    site_id: input.site_id,
    elevator_asset_id: input.elevator_asset_id,
    fault_symptom: input.fault_symptom?.trim() || null,
    is_emergency: input.is_emergency ?? false,
    blocking_crew_id: input.blocking_crew_id?.trim() || null,
  };

  if (!row.number) return err("İş emri numarası gerekli");
  if (!row.work_type) return err("İş türü gerekli");

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { data, error } = await supabase.from("work_orders").insert(row).select("id").single();
    if (error) return err(error.message);
    if (!data?.id) return err("No id returned");
    return { ok: true, id: data.id as string };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO work_orders (
       tenant_id, number, work_type, priority, status, source,
       customer_id, site_id, elevator_asset_id, fault_symptom, is_emergency, blocking_crew_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      tenantId,
      row.number,
      row.work_type,
      row.priority,
      row.status,
      row.source,
      row.customer_id,
      row.site_id,
      row.elevator_asset_id,
      row.fault_symptom,
      row.is_emergency,
      row.blocking_crew_id,
    ],
  );
  if (!rows[0]) return err("Insert failed");
  return { ok: true, id: rows[0].id };
}

export async function updateWorkOrderBlockingCrew(
  tenantId: string,
  workOrderId: string,
  blockingCrewId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { error } = await supabase
      .from("work_orders")
      .update({ blocking_crew_id: blockingCrewId })
      .eq("tenant_id", tenantId)
      .eq("id", workOrderId);
    if (error) return err(error.message);
    return { ok: true };
  }
  const pool = getPool();
  const r = await pool.query(
    `UPDATE work_orders SET blocking_crew_id = $1 WHERE tenant_id = $2 AND id = $3`,
    [blockingCrewId, tenantId, workOrderId],
  );
  if (r.rowCount === 0) return err("Bulunamadı");
  return { ok: true };
}

export async function updateWorkOrderStatus(
  tenantId: string,
  workOrderId: string,
  input: { status: string; actual_end?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = input.status.trim();
  if (!status) return err("Durum gerekli");

  const patch: Record<string, unknown> = { status };
  if (input.actual_end !== undefined) {
    patch.actual_end = input.actual_end;
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return err("Supabase not available");
    const { error } = await supabase.from("work_orders").update(patch).eq("tenant_id", tenantId).eq("id", workOrderId);
    if (error) return err(error.message);
    return { ok: true };
  }

  const pool = getPool();
  if (input.actual_end !== undefined) {
    const r = await pool.query(
      `UPDATE work_orders SET status = $1, actual_end = $2::timestamptz
       WHERE tenant_id = $3 AND id = $4`,
      [status, input.actual_end, tenantId, workOrderId],
    );
    if (r.rowCount === 0) return err("Bulunamadı");
  } else {
    const r = await pool.query(`UPDATE work_orders SET status = $1 WHERE tenant_id = $2 AND id = $3`, [
      status,
      tenantId,
      workOrderId,
    ]);
    if (r.rowCount === 0) return err("Bulunamadı");
  }
  return { ok: true };
}

export async function deleteFinanceEntry(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      if (!supabase) return err("Supabase not available");
      const { error } = await supabase.from("finance_entries").delete().eq("tenant_id", tenantId).eq("id", id);
      if (error) return err(error.message);
      return { ok: true };
    }
    const pool = getPool();
    const r = await pool.query(`DELETE FROM finance_entries WHERE tenant_id = $1 AND id = $2`, [
      tenantId,
      id,
    ]);
    if (r.rowCount === 0) return err("Not found");
    return { ok: true };
  } catch (e) {
    return err(e instanceof Error ? e.message : "Silinemedi");
  }
}
