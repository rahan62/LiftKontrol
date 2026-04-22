import { isSupabaseConfigured } from "@/lib/auth/config";
import { financeEntryExistsForAssetNotesContaining } from "@/lib/data/finance-idempotency";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { insertFinanceEntry } from "@/lib/data/writes";

/** Embedded in finance_entries.notes for idempotent auto fee rows per asset + calendar month. */
function autoMaintenanceMonthAssetMarker(assetId: string, yearMonth: string): string {
  return `AUTO_MAINTENANCE_MONTH_ASSET:${assetId}:${yearMonth}`;
}

/**
 * When monthly maintenance is recorded for an asset, create a finance entry for that unit's
 * periodic fee only if `maintenance_fee_period = 'monthly'`. Yearly fees are not auto-posted here.
 */
export async function maybeCreateSiteMaintenanceFeeFinance(
  tenantId: string,
  assetId: string,
  yearMonth: string,
): Promise<{ created: boolean; financeEntryId?: string }> {
  let unit: {
    unit_code: string;
    maintenance_fee: unknown;
    maintenance_fee_period: string | null;
  } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("elevator_assets")
        .select("unit_code, maintenance_fee, maintenance_fee_period")
        .eq("tenant_id", tenantId)
        .eq("id", assetId)
        .maybeSingle();
      if (data) {
        unit = {
          unit_code: String(data.unit_code ?? ""),
          maintenance_fee: data.maintenance_fee,
          maintenance_fee_period: data.maintenance_fee_period as string | null,
        };
      }
    }
  } else {
    const pool = getPool();
    const { rows } = await pool.query<{
      unit_code: string;
      maintenance_fee: unknown;
      maintenance_fee_period: string | null;
    }>(
      `SELECT unit_code, maintenance_fee, maintenance_fee_period
       FROM elevator_assets WHERE tenant_id = $1 AND id = $2`,
      [tenantId, assetId],
    );
    unit = rows[0] ?? null;
  }

  if (!unit) return { created: false };

  const feeRaw = unit.maintenance_fee;
  const amount = feeRaw !== null && feeRaw !== undefined ? Number(feeRaw) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { created: false };
  }

  const period = unit.maintenance_fee_period?.trim() || null;
  if (period !== "monthly") {
    return { created: false };
  }

  const marker = autoMaintenanceMonthAssetMarker(assetId, yearMonth);
  if (await financeEntryExistsForAssetNotesContaining(tenantId, assetId, marker)) {
    return { created: false };
  }

  const unitLabel = unit.unit_code?.trim() || "Ünite";
  const d = new Date(yearMonth + "T12:00:00");
  const monthTitle = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(d);

  const result = await insertFinanceEntry(tenantId, {
    site_id: null,
    elevator_asset_id: assetId,
    entry_type: "fee",
    amount,
    currency: "TRY",
    label: `Aylık bakım ücreti — ${unitLabel} (${monthTitle})`,
    notes: `${marker}\nAylık bakım kaydı tamamlandığında otomatik oluşturuldu.`,
    occurred_on: yearMonth,
    payment_status: "unpaid",
  });

  if (!result.ok) {
    return { created: false };
  }
  return { created: true, financeEntryId: result.id };
}
