/** Stored in `elevator_assets.maintenance_fee_period`. */
export const ASSET_MAINTENANCE_FEE_PERIODS = [
  { value: "", label: "—" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
] as const;

export type AssetMaintenanceFeePeriodValue = "monthly" | "yearly";

export function normalizeAssetMaintenanceFeePeriod(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim();
  if (v === "monthly" || v === "yearly") return v;
  return null;
}
