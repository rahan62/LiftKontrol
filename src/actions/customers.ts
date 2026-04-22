"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { deleteCustomer, insertCustomer, updateCustomer, type CustomerInput } from "@/lib/data/writes";

function parseBilling(formData: FormData): Record<string, unknown> {
  return {
    line1: String(formData.get("addr_line1") ?? "").trim(),
    city: String(formData.get("addr_city") ?? "").trim(),
    region: String(formData.get("addr_region") ?? "").trim(),
    postal_code: String(formData.get("addr_postal") ?? "").trim(),
    country: String(formData.get("addr_country") ?? "").trim(),
  };
}

export async function createCustomerAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return { ok: false as const, error: "Legal name is required" };
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
  revalidatePath("/app/customers");
  return { ok: true as const, id: result.id };
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const tenantId = await requireTenantId();
  const legal_name = String(formData.get("legal_name") ?? "").trim();
  if (!legal_name) {
    return { ok: false as const, error: "Legal name is required" };
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
