"use client";

import { MaintenanceCompleteDialog } from "@/components/maintenance/maintenance-complete-dialog";
import { deleteMonthlyMaintenanceAction } from "@/actions/maintenance";
import { tr } from "@/lib/i18n/tr";
import type { ElevatorMonthRow } from "@/lib/domain/maintenance-month";
import { firstDayOfMonth } from "@/lib/domain/maintenance-month";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useState } from "react";

function checklistSummary(c: Record<string, string> | null): string {
  if (!c || !Object.keys(c).length) return "—";
  const issues = Object.values(c).filter((v) => v === "issue").length;
  if (issues > 0) return `${issues} aksaklık`;
  return "Tamam";
}

type Props = {
  year: number;
  month: number;
  initialRows: ElevatorMonthRow[];
};

export function MaintenanceMonthClient({ year, month, initialRows }: Props) {
  const [q, setQ] = useState("");
  const [dialogRow, setDialogRow] = useState<ElevatorMonthRow | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const yearMonth = firstDayOfMonth(year, month);
  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return initialRows;
    return initialRows.filter((r) =>
      [r.unit_code, r.site_name, r.customer_name].some((f) => String(f ?? "").toLowerCase().includes(s)),
    );
  }, [initialRows, q]);

  function goMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    router.push(`${pathname}?y=${d.getFullYear()}&m=${d.getMonth() + 1}`);
  }

  async function remove(row: ElevatorMonthRow) {
    if (!row.maintenance_id) return;
    if (!window.confirm("Bu ay bakım kaydını silinsin mi?")) return;
    const res = await deleteMonthlyMaintenanceAction(row.maintenance_id);
    if (!res.ok) alert(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600"
          >
            {tr.maintenance.prevMonth}
          </button>
          <div className="min-w-[12rem] text-center text-sm font-semibold capitalize text-slate-900 dark:text-white">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600"
          >
            {tr.maintenance.nextMonth}
          </button>
        </div>
        <input
          className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          placeholder={tr.common.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={tr.common.search}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.maintenance.unit}</th>
              <th className="px-4 py-2">{tr.maintenance.site}</th>
              <th className="px-4 py-2">{tr.maintenance.customer}</th>
              <th className="px-4 py-2">{tr.maintenance.status}</th>
              <th className="px-4 py-2">{tr.maintenance.completedAt}</th>
              <th className="px-4 py-2">{tr.maintenance.monthlyCheckCol}</th>
              <th className="px-4 py-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.length ? (
              filtered.map((row) => {
                const done = Boolean(row.maintenance_id);
                return (
                  <tr key={row.asset_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-4 py-2 font-mono text-xs">{row.unit_code}</td>
                    <td className="px-4 py-2">{row.site_name}</td>
                    <td className="px-4 py-2">{row.customer_name}</td>
                    <td className="px-4 py-2">
                      {done ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          {tr.maintenance.done}
                        </span>
                      ) : (
                        <span className="text-slate-500">{tr.maintenance.pending}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {row.completed_at ? new Date(row.completed_at).toLocaleString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">{checklistSummary(row.monthly_checklist)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!done ? (
                          <button
                            type="button"
                            onClick={() => setDialogRow(row)}
                            className="rounded bg-slate-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-slate-900"
                          >
                            {tr.maintenance.addMaintenance}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setDialogRow(row)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                            >
                              {tr.maintenance.updateMonthly}
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(row)}
                              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 dark:border-rose-800 dark:text-rose-300"
                            >
                              {tr.maintenance.removeMaintenance}
                            </button>
                          </>
                        )}
                        <Link
                          href={`/app/maintenance/parts?asset_id=${encodeURIComponent(row.asset_id)}&site_id=${encodeURIComponent(row.site_id)}&unit_code=${encodeURIComponent(row.unit_code)}`}
                          className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                        >
                          {tr.maintenance.partsUsage}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  Kayıt yok veya arama sonucu boş.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">{tr.maintenance.partsUsageHint}</p>
      <Link
        href="/app/maintenance/parts"
        className="inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
      >
        {tr.maintenance.goToParts} →
      </Link>

      <MaintenanceCompleteDialog
        open={dialogRow !== null}
        assetId={dialogRow?.asset_id ?? ""}
        unitLabel={dialogRow ? `${dialogRow.unit_code} · ${dialogRow.site_name}` : ""}
        yearMonth={yearMonth}
        initialNotes={dialogRow?.notes ?? null}
        initialChecklist={dialogRow?.monthly_checklist ?? null}
        onClose={() => setDialogRow(null)}
      />
    </div>
  );
}
