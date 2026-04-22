"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { insertStockItemRow, type StockItemInsertInput } from "@/lib/data/stock-items-write";

export async function createStockItemAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const input: StockItemInsertInput = {
    sku: String(formData.get("sku") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    uom: String(formData.get("uom") ?? "").trim() || "ad",
    min_qty: numOrNull(formData, "min_qty"),
    max_qty: numOrNull(formData, "max_qty"),
    part_category: String(formData.get("part_category") ?? "").trim() || null,
    subsystem: String(formData.get("subsystem") ?? "").trim() || null,
    manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
    oem_part_number: String(formData.get("oem_part_number") ?? "").trim() || null,
    compatibility_notes: String(formData.get("compatibility_notes") ?? "").trim() || null,
    material_grade: String(formData.get("material_grade") ?? "").trim() || null,
    unit_cost: numOrNull(formData, "unit_cost"),
  };
  if (!input.sku || !input.description) {
    redirect("/app/stock/new");
  }
  const result = await insertStockItemRow(tenantId, input);
  if (!result.ok) {
    redirect("/app/stock/new");
  }
  revalidatePath("/app/stock");
  redirect("/app/stock");
}

function numOrNull(fd: FormData, key: string): number | null {
  const v = String(fd.get(key) ?? "").trim();
  if (v === "") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
