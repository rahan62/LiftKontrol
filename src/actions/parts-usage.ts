"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { recordPartsUsageBatch, type PartsLine, type WorkType } from "@/lib/data/parts-usage";

export async function recordPartsUsageAction(payload: {
  elevator_asset_id: string;
  site_id: string;
  work_type: WorkType;
  unit_code: string;
  monthly_maintenance_id: string | null;
  work_order_id: string | null;
  lines: PartsLine[];
}) {
  const tenantId = await requireTenantId();
  const result = await recordPartsUsageBatch(tenantId, {
    elevator_asset_id: payload.elevator_asset_id,
    site_id: payload.site_id,
    work_type: payload.work_type,
    lines: payload.lines,
    monthly_maintenance_id: payload.monthly_maintenance_id,
    work_order_id: payload.work_order_id?.trim() || null,
    unit_code: payload.unit_code,
  });
  if (!result.ok) {
    return result;
  }
  revalidatePath("/app/maintenance");
  revalidatePath("/app/stock");
  revalidatePath("/app/finances");
  revalidatePath("/app/sites");
  revalidatePath("/app/assets");
  revalidatePath("/app/work-orders");
  if (payload.work_order_id?.trim()) {
    revalidatePath(`/app/work-orders/${payload.work_order_id.trim()}`);
  }
  return { ok: true as const, batchId: result.batchId, financeId: result.financeId };
}
