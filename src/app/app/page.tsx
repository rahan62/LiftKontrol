import { AppHeader } from "@/components/layout/app-header";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardCounts } from "@/lib/data/dashboard";
import { listUpcomingPeriodicControls } from "@/lib/data/upcoming-periodic";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;

  let customerCount = 0;
  let contractCount = 0;
  let assetCount = 0;
  let workOrderCount = 0;
  let openBreakdowns = 0;
  let openCallbacks = 0;
  let upcomingPeriodic: Awaited<ReturnType<typeof listUpcomingPeriodicControls>> = [];

  if (tenantId) {
    const counts = await getDashboardCounts(tenantId);
    customerCount = counts.customerCount;
    contractCount = counts.contractCount;
    assetCount = counts.assetCount;
    workOrderCount = counts.workOrderCount;
    openBreakdowns = counts.openBreakdowns;
    openCallbacks = counts.openCallbacks;
    try {
      upcomingPeriodic = await listUpcomingPeriodicControls(tenantId, 20);
    } catch {
      upcomingPeriodic = [];
    }
  }

  return (
    <div>
      <AppHeader
        title={tr.dashboard.title}
        subtitle={tr.dashboard.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/dispatch"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {tr.dashboard.dispatcher}
            </Link>
            <Link
              href="/app/field"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {tr.dashboard.technician}
            </Link>
            <Link
              href="/app/warehouse"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {tr.dashboard.warehouse}
            </Link>
          </div>
        }
      />
      <div className="space-y-8 px-8 py-8">
        <section>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.dashboard.portfolio}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={tr.dashboard.customers} value={customerCount} />
            <StatCard label={tr.dashboard.contracts} value={contractCount} hint="Duruma göre filtre modülde" />
            <StatCard label={tr.dashboard.elevators} value={assetCount} />
            <StatCard label={tr.dashboard.workOrders} value={workOrderCount} />
          </div>
        </section>
        {upcomingPeriodic.length ? (
          <section>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.revisions.upcomingPeriodic}</h2>
            <p className="mt-1 text-xs text-slate-500">{tr.revisions.upcomingPeriodicHint}</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <table className="min-w-full text-sm">
                <thead className="bg-amber-100/80 text-left text-xs font-semibold uppercase text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  <tr>
                    <th className="px-4 py-2">{tr.assets.unit}</th>
                    <th className="px-4 py-2">{tr.assets.site}</th>
                    <th className="px-4 py-2">{tr.customers.name}</th>
                    <th className="px-4 py-2">{tr.en8120.nextControlDue}</th>
                    <th className="px-4 py-2">{tr.revisions.daysLeft}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200/80 dark:divide-amber-900/40">
                  {upcomingPeriodic.map((u) => (
                    <tr key={u.asset_id}>
                      <td className="px-4 py-2 font-mono text-xs">{u.unit_code}</td>
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{u.site_name ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.customer_name ?? "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{u.next_control_due}</td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.days_until_due}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/app/assets/${u.asset_id}`}
                          className="font-medium text-amber-800 hover:underline dark:text-amber-300"
                        >
                          {tr.assets.open}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.dashboard.risk}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={tr.dashboard.openBreakdowns}
              value={openBreakdowns}
              variant={openBreakdowns > 0 ? "danger" : "default"}
            />
            <StatCard label={tr.dashboard.callbacks} value={openCallbacks} hint="Tekrarlayan işler" />
            <StatCard label={tr.dashboard.maintenanceDue} value="—" hint={tr.dashboard.maintenanceDueHint} />
            <StatCard label={tr.dashboard.slaRisk} value="—" hint={tr.dashboard.slaHint} />
          </div>
        </section>
        <p className="text-xs text-slate-500">
          Yerel modda sayılar için{" "}
          <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">DATABASE_URL</code> kullanılır.{" "}
          {tr.dashboard.withSupabase}
        </p>
      </div>
    </div>
  );
}
