/** Types + pure helpers for monthly maintenance UI (no DB imports — safe for client bundles). */

export type ElevatorMonthRow = {
  asset_id: string;
  unit_code: string;
  site_id: string;
  site_name: string;
  customer_name: string;
  maintenance_id: string | null;
  completed_at: string | null;
  notes: string | null;
  /** Monthly visit checklist (rails, doors, engine, brakes, buffer). */
  monthly_checklist: Record<string, string> | null;
};

/** First day of month as YYYY-MM-DD */
export function firstDayOfMonth(year: number, month1to12: number): string {
  const m = String(month1to12).padStart(2, "0");
  return `${year}-${m}-01`;
}
