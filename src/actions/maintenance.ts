"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { maybeCreateSiteMaintenanceFeeFinance } from "@/lib/data/maintenance-site-fee-finance";
import { getPool } from "@/lib/db/pool";

export async function upsertMonthlyMaintenanceAction(
  assetId: string,
  yearMonth: string,
  notes: string,
  checklistJson?: string | null,
): Promise<{ ok: true; financeEntryId?: string } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  let checklistObj: Record<string, unknown> = {};
  if (checklistJson && checklistJson.trim()) {
    try {
      const parsed = JSON.parse(checklistJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        checklistObj = parsed as Record<string, unknown>;
      }
    } catch {
      checklistObj = {};
    }
  }
  const pool = getPool();
  await pool.query(
    `INSERT INTO elevator_monthly_maintenance (tenant_id, elevator_asset_id, year_month, notes, monthly_checklist)
     VALUES ($1, $2, $3::date, $4, $5::jsonb)
     ON CONFLICT (tenant_id, elevator_asset_id, year_month)
     DO UPDATE SET completed_at = now(),
       notes = EXCLUDED.notes,
       monthly_checklist = EXCLUDED.monthly_checklist`,
    [tenantId, assetId, yearMonth, notes.trim() || null, JSON.stringify(checklistObj)],
  );
  revalidatePath("/app/maintenance");

  const fee = await maybeCreateSiteMaintenanceFeeFinance(tenantId, assetId, yearMonth);
  if (fee.created && fee.financeEntryId) {
    revalidatePath("/app/finances");
    revalidatePath(`/app/assets/${assetId}`);
    return { ok: true as const, financeEntryId: fee.financeEntryId };
  }
  return { ok: true as const };
}

export async function deleteMonthlyMaintenanceAction(maintenanceId: string) {
  const tenantId = await requireTenantId();
  const pool = getPool();
  const r = await pool.query(`DELETE FROM elevator_monthly_maintenance WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    maintenanceId,
  ]);
  if (r.rowCount === 0) {
    return { ok: false as const, error: "Kayıt bulunamadı" };
  }
  revalidatePath("/app/maintenance");
  return { ok: true as const };
}
