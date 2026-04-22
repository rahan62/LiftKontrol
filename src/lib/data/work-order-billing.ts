import { financeEntryExistsForAssetNotesContaining } from "@/lib/data/finance-idempotency";
import { insertFinanceEntry } from "@/lib/data/writes";

/** İş emri kapatılırken ek işçilik satırı — tekrar kapatmada çift yazmayı önler. */
export function workOrderLaborFinanceMarker(workOrderId: string): string {
  return `AUTO_WO_LABOR:${workOrderId}`;
}

export async function maybeCreateWorkOrderLaborFinance(
  tenantId: string,
  args: {
    workOrderId: string;
    elevatorAssetId: string;
    unitCode: string;
    workOrderNumber: string;
    laborAmount: number;
    laborNote: string | null;
    occurredOn: string;
  },
): Promise<{ created: boolean; financeEntryId?: string }> {
  if (!Number.isFinite(args.laborAmount) || args.laborAmount <= 0) {
    return { created: false };
  }

  const marker = workOrderLaborFinanceMarker(args.workOrderId);
  if (await financeEntryExistsForAssetNotesContaining(tenantId, args.elevatorAssetId, marker)) {
    return { created: false };
  }

  const result = await insertFinanceEntry(tenantId, {
    site_id: null,
    elevator_asset_id: args.elevatorAssetId,
    entry_type: "fee",
    amount: args.laborAmount,
    currency: "TRY",
    label: `Ek işçilik — ${args.unitCode.trim() || "Ünite"} — ${args.workOrderNumber}`,
    notes: `${marker}\n${(args.laborNote?.trim() || "Arıza/onarım iş emri kapatılırken girildi.").slice(0, 2000)}`,
    occurred_on: args.occurredOn,
    payment_status: "unpaid",
  });

  if (!result.ok) {
    return { created: false };
  }
  return { created: true, financeEntryId: result.id };
}
