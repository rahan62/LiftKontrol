const BILLABLE_LABOR_WORK_TYPES = new Set(["repair", "emergency_breakdown"]);

/** İş emri kapatılırken otomatik «ek işçilik» finans satırına izin verilen türler. */
export function workTypeAllowsAutoLabor(workType: string): boolean {
  return BILLABLE_LABOR_WORK_TYPES.has(workType);
}
