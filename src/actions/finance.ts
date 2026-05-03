"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import {
  deleteFinanceEntry,
  insertFinanceEntry,
  setFinanceEntryPaid,
  type FinanceEntryInput,
} from "@/lib/data/writes";

function money(fd: FormData, key: string): number | null {
  const v = String(fd.get(key) ?? "").trim();
  if (v === "") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function revalidateAccountingPaths() {
  revalidatePath("/app/accounting");
  revalidatePath("/app/accounting/current-accounts");
  revalidatePath("/app/accounting/receivables");
  revalidatePath("/app/accounting/profit-loss");
  revalidatePath("/app/sites");
  revalidatePath("/app/assets");
}

export async function createFinanceEntryAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const scope = String(formData.get("scope") ?? "site");
  const site_id = String(formData.get("site_id") ?? "").trim();
  const elevator_asset_id = String(formData.get("elevator_asset_id") ?? "").trim();

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amountVal = money(formData, "amount");
  if (amountRaw === "" || amountVal === null) {
    return { ok: false as const, error: "Tutar gerekli" };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    return { ok: false as const, error: "Açıklama gerekli" };
  }

  const common = {
    amount: amountVal,
    currency: String(formData.get("currency") ?? "TRY").trim() || "TRY",
    label,
    notes: String(formData.get("notes") ?? "").trim() || null,
    occurred_on: String(formData.get("occurred_on") ?? "").trim() || new Date().toISOString().slice(0, 10),
  };

  let input: FinanceEntryInput;

  if (scope === "tenant_expense") {
    input = {
      site_id: null,
      elevator_asset_id: null,
      entry_type: "expense",
      ...common,
      payment_status: "paid",
    };
  } else if (scope === "elevator") {
    if (!elevator_asset_id) {
      return { ok: false as const, error: "Asansör seçin" };
    }
    input = {
      site_id: null,
      elevator_asset_id,
      entry_type: String(formData.get("entry_type") ?? "other"),
      ...common,
      payment_status: "unpaid",
    };
  } else {
    if (!site_id) {
      return { ok: false as const, error: "Saha seçin" };
    }
    input = {
      site_id,
      elevator_asset_id: null,
      entry_type: String(formData.get("entry_type") ?? "other"),
      ...common,
      payment_status: "unpaid",
    };
  }

  const result = await insertFinanceEntry(tenantId, input);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidateAccountingPaths();
  return { ok: true as const, id: result.id };
}

export async function deleteFinanceEntryAction(id: string) {
  const tenantId = await requireTenantId();
  const result = await deleteFinanceEntry(tenantId, id);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidateAccountingPaths();
  return { ok: true as const };
}

export async function markFinanceEntryPaidAction(id: string, paid: boolean) {
  const tenantId = await requireTenantId();
  const result = await setFinanceEntryPaid(tenantId, id, paid);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  revalidateAccountingPaths();
  return { ok: true as const };
}
