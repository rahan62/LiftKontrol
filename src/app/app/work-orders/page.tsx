import { DataTableShell } from "@/components/module/data-table-shell";
import { listWorkOrders } from "@/lib/data/work-orders";
import {
  workOrderPriorityLabel,
  workOrderStatusLabel,
  workOrderTypeLabel,
} from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";

export default async function WorkOrdersPage() {
  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;

  const rows = tenantId ? await listWorkOrders(tenantId) : [];

  return (
    <DataTableShell
      title={tr.workOrders.title}
      description={tr.workOrders.description}
      actions={
        <Link
          href="/app/work-orders/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.workOrders.newBreakdown}
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.workOrders.number}</th>
              <th className="px-4 py-2">{tr.workOrders.type}</th>
              <th className="px-4 py-2">{tr.workOrders.woStatus}</th>
              <th className="px-4 py-2">{tr.workOrders.priority}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-mono text-xs">{w.number}</td>
                  <td className="px-4 py-2">{workOrderTypeLabel(String(w.work_type ?? ""))}</td>
                  <td className="px-4 py-2">{workOrderStatusLabel(String(w.status ?? ""))}</td>
                  <td className="px-4 py-2">
                    {w.is_emergency ? (
                      <span className="text-rose-600 dark:text-rose-400">{tr.workOrders.emergency}</span>
                    ) : (
                      workOrderPriorityLabel(String(w.priority ?? ""))
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/app/work-orders/${w.id}`}
                      className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {tr.workOrders.open}
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  {tr.workOrders.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
