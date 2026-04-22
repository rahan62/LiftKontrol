"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import {
  deleteAsset,
  insertAsset,
  updateAsset,
  verifySiteForTenant,
  type AssetInput,
} from "@/lib/data/writes";
import { normalizeAssetMaintenanceFeePeriod } from "@/lib/domain/asset-maintenance";

function parseEn8120FromForm(formData: FormData): Pick<
  AssetInput,
  | "en8120_control_authority"
  | "private_control_company_name"
  | "en8120_next_control_due"
  | "maintenance_transfer_basis"
> {
  const auth = String(formData.get("en8120_control_authority") ?? "").trim();
  const en8120_control_authority =
    auth === "government" || auth === "private_control_company" ? auth : null;
  const transfer = String(formData.get("maintenance_transfer_basis") ?? "").trim();
  const maintenance_transfer_basis =
    transfer === "direct_after_prior_expiry" || transfer === "after_annual_en8120" ? transfer : null;
  const due = String(formData.get("en8120_next_control_due") ?? "").trim();
  return {
    en8120_control_authority,
    private_control_company_name: String(formData.get("private_control_company_name") ?? "").trim() || null,
    en8120_next_control_due: due || null,
    maintenance_transfer_basis,
  };
}
import { listSitesForCustomer } from "@/lib/data/sites";

function num(formData: FormData, key: string): number | null {
  const v = String(formData.get(key) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createAssetAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const customer_id = String(formData.get("customer_id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  const unit_code = String(formData.get("unit_code") ?? "").trim();
  if (!customer_id || !site_id || !unit_code) {
    return { ok: false as const, error: "Customer, site, and unit code are required" };
  }
  const ok = await verifySiteForTenant(tenantId, site_id, customer_id);
  if (!ok) {
    return { ok: false as const, error: "Site does not match customer" };
  }
  const input: AssetInput = {
    customer_id,
    site_id,
    unit_code,
    elevator_type: String(formData.get("elevator_type") ?? "other"),
    brand: String(formData.get("brand") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    serial_number: String(formData.get("serial_number") ?? "").trim() || null,
    controller_type: String(formData.get("controller_type") ?? "").trim() || null,
    drive_type: String(formData.get("drive_type") ?? "").trim() || null,
    door_type: String(formData.get("door_type") ?? "").trim() || null,
    stops: num(formData, "stops"),
    capacity_kg: num(formData, "capacity_kg"),
    persons: num(formData, "persons"),
    speed: num(formData, "speed"),
    operational_status: String(formData.get("operational_status") ?? "in_service"),
    unsafe_flag: formData.get("unsafe_flag") === "on",
    maintenance_fee: num(formData, "maintenance_fee"),
    maintenance_fee_period: normalizeAssetMaintenanceFeePeriod(String(formData.get("maintenance_fee_period") ?? "")),
    ...parseEn8120FromForm(formData),
  };
  const result = await insertAsset(tenantId, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidatePath("/app/assets");
  revalidatePath(`/app/sites/${site_id}`);
  return { ok: true as const, id: result.id };
}

export async function updateAssetAction(id: string, formData: FormData) {
  const tenantId = await requireTenantId();
  const customer_id = String(formData.get("customer_id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  const unit_code = String(formData.get("unit_code") ?? "").trim();
  if (!customer_id || !site_id || !unit_code) {
    return { ok: false as const, error: "Customer, site, and unit code are required" };
  }
  const ok = await verifySiteForTenant(tenantId, site_id, customer_id);
  if (!ok) {
    return { ok: false as const, error: "Site does not match customer" };
  }
  const input: AssetInput = {
    customer_id,
    site_id,
    unit_code,
    elevator_type: String(formData.get("elevator_type") ?? "other"),
    brand: String(formData.get("brand") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    serial_number: String(formData.get("serial_number") ?? "").trim() || null,
    controller_type: String(formData.get("controller_type") ?? "").trim() || null,
    drive_type: String(formData.get("drive_type") ?? "").trim() || null,
    door_type: String(formData.get("door_type") ?? "").trim() || null,
    stops: num(formData, "stops"),
    capacity_kg: num(formData, "capacity_kg"),
    persons: num(formData, "persons"),
    speed: num(formData, "speed"),
    operational_status: String(formData.get("operational_status") ?? "in_service"),
    unsafe_flag: formData.get("unsafe_flag") === "on",
    maintenance_fee: num(formData, "maintenance_fee"),
    maintenance_fee_period: normalizeAssetMaintenanceFeePeriod(String(formData.get("maintenance_fee_period") ?? "")),
    ...parseEn8120FromForm(formData),
  };
  const result = await updateAsset(tenantId, id, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidatePath("/app/assets");
  revalidatePath(`/app/assets/${id}`);
  revalidatePath(`/app/sites/${site_id}`);
  return { ok: true as const };
}

export async function deleteAssetAction(id: string) {
  const tenantId = await requireTenantId();
  const result = await deleteAsset(tenantId, id);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidatePath("/app/assets");
  revalidatePath("/app/sites");
  return { ok: true as const };
}

/** Sites for a customer (for cascading selects in client forms). */
export async function getSitesForCustomer(customerId: string) {
  const tenantId = await requireTenantId();
  return listSitesForCustomer(tenantId, customerId);
}
