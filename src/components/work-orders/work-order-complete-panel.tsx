"use client";

import { completeWorkOrderWithBillingAction } from "@/actions/work-orders";
import { workTypeAllowsAutoLabor } from "@/lib/domain/work-order-billing";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { tr } from "@/lib/i18n/tr";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  workOrderId: string;
  workOrderNumber: string;
  workType: string;
  status: string;
  elevatorAssetId: string | null;
};

export function WorkOrderCompletePanel({
  workOrderId,
  workOrderNumber,
  workType,
  status,
  elevatorAssetId,
}: Props) {
  const router = useRouter();
  const [laborAmount, setLaborAmount] = useState("");
  const [laborNote, setLaborNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const closed = status === "completed" || status === "cancelled";
  const canLabor = workTypeAllowsAutoLabor(workType);

  if (closed || !elevatorAssetId) {
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await completeWorkOrderWithBillingAction({
      work_order_id: workOrderId,
      labor_amount: laborAmount,
      labor_note: laborNote,
      occurred_on: occurredOn,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.financeEntryId) {
      router.push(`/app/finances?createdFee=${encodeURIComponent(res.financeEntryId)}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {tr.workOrders.completeSection} · {workOrderNumber}
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{tr.workOrders.completeHint}</p>
      {!canLabor ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{tr.workOrders.laborNotAllowedHint}</p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className={label}>{tr.workOrders.laborAmount}</label>
          <input
            className={field}
            type="text"
            inputMode="decimal"
            value={laborAmount}
            onChange={(e) => setLaborAmount(e.target.value)}
            placeholder="0 veya boş"
            disabled={!canLabor}
          />
        </div>
        <div>
          <label className={label}>{tr.workOrders.laborNote}</label>
          <input
            className={field}
            type="text"
            value={laborNote}
            onChange={(e) => setLaborNote(e.target.value)}
            disabled={!canLabor}
          />
        </div>
        <div>
          <label className={label}>{tr.workOrders.occurredOn}</label>
          <input
            className={field}
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? tr.common.loading : tr.workOrders.completeWorkOrder}
        </button>
      </form>
    </div>
  );
}
