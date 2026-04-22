"use client";

import { updateWorkOrderBlockingCrewAction } from "@/actions/work-orders";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import type { FieldCrewRow } from "@/lib/data/field-crews";
import { tr } from "@/lib/i18n/tr";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  workOrderId: string;
  crews: FieldCrewRow[];
  initialCrewId: string | null;
  workType: string;
  status: string;
};

export function WorkOrderBlockingCrewForm({
  workOrderId,
  crews,
  initialCrewId,
  workType,
  status,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [crewId, setCrewId] = useState(initialCrewId ?? "");
  const [error, setError] = useState<string | null>(null);

  const closed = status === "completed" || status === "cancelled";
  const repairLike = workType === "repair" || workType === "emergency_breakdown";
  if (closed || !repairLike || !crews.length) return null;

  async function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateWorkOrderBlockingCrewAction(
        workOrderId,
        crewId.trim() || null,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase text-slate-500">{tr.workOrders.blockingCrewTitle}</div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.workOrders.blockingCrewHint}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className={label}>{tr.schedule.crew}</label>
          <select className={field} value={crewId} onChange={(e) => setCrewId(e.target.value)}>
            <option value="">{tr.workOrders.blockingCrewNone}</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => void save()}>
          {pending ? tr.common.loading : tr.common.save}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
