"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { ensureGeocodingForSites, extractLatLngFromGeo } from "@/lib/data/route-plans";
import { getSite } from "@/lib/data/sites";
import {
  assertCustomerBelongsToTenant,
  deleteSite,
  insertSite,
  updateSite,
  type SiteInput,
} from "@/lib/data/writes";

function parseAddress(formData: FormData): Record<string, unknown> {
  return {
    line1: String(formData.get("addr_line1") ?? "").trim(),
    city: String(formData.get("addr_city") ?? "").trim(),
    region: String(formData.get("addr_region") ?? "").trim(),
    postal_code: String(formData.get("addr_postal") ?? "").trim(),
    country: String(formData.get("addr_country") ?? "").trim(),
  };
}

function parseGeo(formData: FormData): Record<string, unknown> | null {
  const lat = String(formData.get("geo_lat") ?? "").trim().replace(",", ".");
  const lng = String(formData.get("geo_lng") ?? "").trim().replace(",", ".");
  if (!lat && !lng) return null;
  if (!lat || !lng) return null;
  const la = Number.parseFloat(lat);
  const ln = Number.parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

export async function createSiteAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const customer_id = String(formData.get("customer_id") ?? "");
  if (!(await assertCustomerBelongsToTenant(tenantId, customer_id))) {
    return { ok: false as const, error: "Invalid customer" };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false as const, error: "Site name is required" };
  }
  const input: SiteInput = {
    customer_id,
    name,
    service_address: parseAddress(formData),
    billing_same_as_service: formData.get("billing_same_as_service") === "on",
    access_instructions: String(formData.get("access_instructions") ?? "").trim() || null,
    machine_room_notes: String(formData.get("machine_room_notes") ?? "").trim() || null,
    shaft_notes: String(formData.get("shaft_notes") ?? "").trim() || null,
    emergency_phones: String(formData.get("emergency_phones") ?? "").trim() || null,
    maintenance_fee: null,
    maintenance_fee_period: null,
    maintenance_notes: String(formData.get("maintenance_notes") ?? "").trim() || null,
  };
  const result = await insertSite(tenantId, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  try {
    await ensureGeocodingForSites(tenantId, [result.id]);
  } catch (e) {
    console.error("[sites] ensureGeocodingForSites after create", e);
  }
  revalidatePath("/app/sites");
  return { ok: true as const, id: result.id };
}

export async function updateSiteAction(id: string, formData: FormData) {
  const tenantId = await requireTenantId();
  const customer_id = String(formData.get("customer_id") ?? "");
  if (!(await assertCustomerBelongsToTenant(tenantId, customer_id))) {
    return { ok: false as const, error: "Invalid customer" };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false as const, error: "Site name is required" };
  }
  const input: SiteInput = {
    customer_id,
    name,
    service_address: parseAddress(formData),
    billing_same_as_service: formData.get("billing_same_as_service") === "on",
    access_instructions: String(formData.get("access_instructions") ?? "").trim() || null,
    machine_room_notes: String(formData.get("machine_room_notes") ?? "").trim() || null,
    shaft_notes: String(formData.get("shaft_notes") ?? "").trim() || null,
    emergency_phones: String(formData.get("emergency_phones") ?? "").trim() || null,
    maintenance_fee: null,
    maintenance_fee_period: null,
    maintenance_notes: String(formData.get("maintenance_notes") ?? "").trim() || null,
    geo: parseGeo(formData),
  };
  const result = await updateSite(tenantId, id, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  try {
    await ensureGeocodingForSites(tenantId, [id]);
  } catch (e) {
    console.error("[sites] ensureGeocodingForSites after update", e);
  }
  revalidatePath("/app/sites");
  revalidatePath(`/app/sites/${id}`);
  return { ok: true as const };
}

export async function deleteSiteAction(id: string) {
  const tenantId = await requireTenantId();
  const result = await deleteSite(tenantId, id);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidatePath("/app/sites");
  return { ok: true as const };
}

/** Hizmet adresinden koordinatı yeniden al (Nominatim). Mevcut geo üzerine yazar. */
export async function geocodeSiteFromAddressAction(siteId: string) {
  const tenantId = await requireTenantId();
  const before = await getSite(tenantId, siteId);
  if (!before) {
    return { ok: false as const, error: "Saha bulunamadı" };
  }
  try {
    await ensureGeocodingForSites(tenantId, [siteId], undefined, { force: true });
  } catch (e) {
    console.error("[sites] geocodeSiteFromAddressAction", e);
    return { ok: false as const, error: "Konum servisi şu an yanıt vermedi; sonra tekrar deneyin." };
  }
  const after = await getSite(tenantId, siteId);
  const ll = extractLatLngFromGeo(after?.geo);
  revalidatePath("/app/sites");
  revalidatePath(`/app/sites/${siteId}`);
  if (!ll) {
    return { ok: true as const, hit: false as const };
  }
  return { ok: true as const, hit: true as const, lat: ll.lat, lng: ll.lng };
}
