import { tr } from "./tr";

/** Finans kaydı `entry_type` → Türkçe etiket (bilinmeyen türler için snake_case ayrıştırma). */
export function entryTypeLabel(type: string): string {
  const map = tr.finances.entryTypeLabels as Record<string, string>;
  const key = type.trim();
  return map[key] ?? key.replace(/_/g, " ");
}

/** Asansör `operational_status` → Türkçe etiket. */
export function operationalStatusLabel(status: string): string {
  const map = tr.assets.operationalLabels as Record<string, string>;
  const key = status.trim();
  return map[key] ?? key.replace(/_/g, " ");
}
