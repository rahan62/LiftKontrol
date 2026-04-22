import { DataTableShell } from "@/components/module/data-table-shell";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  return (
    <DataTableShell title={tr.reports.title} description={tr.reports.description} actions={null}>
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.reports.workOrdersCsv}</div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tr.reports.workOrdersCsvHint}</p>
          <Link
            href="/api/reports/work-orders-csv"
            className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
          >
            {tr.reports.downloadCsv}
          </Link>
        </div>
      </div>
    </DataTableShell>
  );
}
