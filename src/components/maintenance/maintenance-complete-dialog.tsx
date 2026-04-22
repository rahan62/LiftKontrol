"use client";

import { upsertMonthlyMaintenanceAction } from "@/actions/maintenance";
import { CHECKPOINT_STATUS, MONTHLY_MAINTENANCE_CHECKPOINTS } from "@/lib/domain/en8120";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function defaultStatus(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const c of MONTHLY_MAINTENANCE_CHECKPOINTS) o[c.key] = "ok";
  return o;
}

type Props = {
  open: boolean;
  unitLabel: string;
  yearMonth: string;
  onClose: () => void;
  assetId: string;
  initialNotes?: string | null;
  initialChecklist?: Record<string, string> | null;
};

export function MaintenanceCompleteDialog({
  open,
  unitLabel,
  yearMonth,
  onClose,
  assetId,
  initialNotes,
  initialChecklist,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("Tamamlandı");
  const [status, setStatus] = useState<Record<string, string>>(defaultStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNotes(initialNotes?.trim() || "Tamamlandı");
    const base = defaultStatus();
    if (initialChecklist) {
      for (const k of Object.keys(base)) {
        const v = initialChecklist[k];
        if (v === "ok" || v === "issue" || v === "na") base[k] = v;
      }
    }
    setStatus(base);
    setError(null);
  }, [open, initialNotes, initialChecklist]);

  const checklistJson = useMemo(() => JSON.stringify(status), [status]);

  if (!open) return null;

  async function submit() {
    setError(null);
    setPending(true);
    const res = await upsertMonthlyMaintenanceAction(assetId, yearMonth, notes, checklistJson);
    setPending(false);
    if (!res.ok) {
      setError("Kayıt başarısız");
      return;
    }
    onClose();
    if (res.financeEntryId) {
      router.push(`/app/finances?createdFee=${encodeURIComponent(res.financeEntryId)}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-950">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {tr.maintenance.monthlyDialogTitle} — {unitLabel}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{tr.maintenance.monthlyDialogSubtitle}</p>
        <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/90">{tr.maintenance.monthlyFinanceAutoHint}</p>

        <div className="mt-4 space-y-3">
          {MONTHLY_MAINTENANCE_CHECKPOINTS.map((c) => (
            <div key={c.key} className="rounded border border-slate-200 p-2 dark:border-slate-700">
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{c.label}</div>
              <p className="text-[11px] text-slate-500">{c.hint}</p>
              <select
                className={`${field} mt-1 text-sm`}
                value={status[c.key] ?? "ok"}
                onChange={(e) => setStatus((s) => ({ ...s, [c.key]: e.target.value }))}
              >
                {CHECKPOINT_STATUS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className={label}>{tr.maintenance.notes}</label>
          <textarea className={field} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={pending} onClick={() => void submit()}>
            {pending ? tr.common.loading : tr.common.save}
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            onClick={onClose}
          >
            {tr.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
