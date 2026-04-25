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

/** Müşteri `status` (active / inactive / suspended) → Türkçe etiket. */
export function customerStatusLabel(status: string): string {
  const map = tr.customers.statusLabels as Record<string, string>;
  const key = status.trim();
  return map[key] ?? key.replace(/_/g, " ");
}

/** İş emri `work_type` → Türkçe etiket. */
export function workOrderTypeLabel(type: string): string {
  const map = tr.workOrders.workTypeLabels as Record<string, string>;
  const key = type.trim();
  return map[key] ?? key.replace(/_/g, " ");
}

/** İş emri `status` → Türkçe etiket. */
export function workOrderStatusLabel(status: string): string {
  const map = tr.workOrders.workStatusLabels as Record<string, string>;
  const key = status.trim();
  return map[key] ?? key.replace(/_/g, " ");
}

/** İş emri `priority` → Türkçe etiket. */
export function workOrderPriorityLabel(priority: string): string {
  const map = tr.workOrders.priorityLabels as Record<string, string>;
  const key = priority.trim();
  return map[key] ?? key.replace(/_/g, " ");
}
