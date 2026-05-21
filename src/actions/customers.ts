"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import {
  deleteCustomer,
  insertCustomer,
  updateCustomer,
  upsertPrimaryCustomerContact,
  type CustomerInput,
} from "@/lib/data/writes";
import { tr } from "@/lib/i18n/tr";
import { formatTrGsmE164 } from "@/lib/sms/phone-tr";

function parseBilling(formData: FormData): Record<string, unknown> {
  return {
    line1: String(formData.get("addr_line1") ?? "").trim(),
    city: String(formData.get("addr_city") ?? "").trim(),
    region: String(formData.get("addr_region") ?? "").trim(),
    postal_code: String(formData.get("addr_postal") ?? "").trim(),
    country: String(formData.get("addr_country") ?? "").trim(),
  };
}

function parsePrimaryContactFromForm(formData: FormData):
  | { ok: true; phoneE164: string | null; contactName: string | null }
  | { ok: false; error: string } {
  const name = String(formData.get("primary_contact_name") ?? "").trim();
  const digits = String(formData.get("primary_contact_phone_digits") ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

  if (!name && digits.length === 0) {
    return { ok: true, phoneE164: null, contactName: null };
  }
  if (name && digits.length === 0) {
    return { ok: false, error: tr.customers.primaryContactNeedPhone };
  }
  if (!name && digits.length > 0) {
    return { ok: false, error: tr.customers.primaryContactNeedName };
  }
  if (digits.length !== 10) {
    return { ok: false, error: tr.customers.primaryContactNeedTenDigits };
  }
  if (!/^5\d{9}$/.test(digits)) {
    return { ok: false, error: tr.customers.primaryContactInvalidGsm };
  }
  const phoneE164 = formatTrGsmE164(`+90${digits}`);
  if (!phoneE164) {
    return { ok: false, error: tr.customers.primaryContactInvalidGsm };
  }
  return { ok: true, phoneE164, contactName: name };
}

export async function createCustomerAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return { ok: false as const, error: "Legal name is required" };
  }

  const pc = parsePrimaryContactFromForm(formData);
  if (!pc.ok) {
    return { ok: false as const, error: pc.error };
  }

  const input: CustomerInput = {
    legal_name,
    code: String(formData.get("code") ?? "").trim() || null,
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    billing_address: parseBilling(formData),
  };
  const result = await insertCustomer(tenantId, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  const up = await upsertPrimaryCustomerContact(tenantId, result.id, pc.contactName, pc.phoneE164);
  if (!up.ok) {
    await deleteCustomer(tenantId, result.id);
    return { ok: false as const, error: up.error };
  }

  revalidatePath("/app/customers");
  return { ok: true as const, id: result.id };
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const tenantId = await requireTenantId();
  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return { ok: false as const, error: "Legal name is required" };
  }

  const pc = parsePrimaryContactFromForm(formData);
  if (!pc.ok) {
    return { ok: false as const, error: pc.error };
  }

  const input: CustomerInput = {
    legal_name,
    code: String(formData.get("code") ?? "").trim() || null,
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    billing_address: parseBilling(formData),
  };
  const result = await updateCustomer(tenantId, id, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  const up = await upsertPrimaryCustomerContact(tenantId, id, pc.contactName, pc.phoneE164);
  if (!up.ok) {
    return { ok: false as const, error: up.error };
  }

  revalidatePath("/app/customers");
  revalidatePath(`/app/customers/${id}`);
  return { ok: true as const };
}

export async function deleteCustomerAction(id: string) {
  const tenantId = await requireTenantId();
  const result = await deleteCustomer(tenantId, id);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidatePath("/app/customers");
  return { ok: true as const };
}
