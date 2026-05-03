import { DashboardRangeForm } from "@/components/dashboard/dashboard-range-form";
import { AppHeader } from "@/components/layout/app-header";
import { StatCard } from "@/components/ui/stat-card";
import { defaultDashboardRangeUTC, resolveDashboardRange } from "@/lib/dashboard-range";
import { getDashboardCounts } from "@/lib/data/dashboard";
import { getDashboardMetricTotals } from "@/lib/data/dashboard-metrics";
import { formatMoneyAmount } from "@/lib/format/money";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";

function metricHref(slug: string, from: string, to: string) {
  const q = new URLSearchParams({ from, to }).toString();
  return `/app/dashboard/${slug}?${q}`;
}

function formatRevenueTotals(rows: { currency: string; sum: number }[]): string {
  if (!rows.length) return "—";
  return rows.map((r) => formatMoneyAmount(String(r.sum), r.currency)).join(" · ");
}

type Search = Promise<{ from?: string; to?: string }>;

export default async function AdminDashboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const { from, to } = resolveDashboardRange(sp.from, sp.to);
  const defaults = defaultDashboardRangeUTC();

  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;

  let customerCount = 0;
  let contractCount = 0;
  let assetCount = 0;
  let workOrderCount = 0;
  let metrics = {
    maintenanceExpectedSlots: 0,
    maintenanceCoveredCount: 0,
    revenueByCurrency: [] as { currency: string; sum: number }[],
    failuresCreatedCount: 0,
    failuresUnsolvedCount: 0,
    periodicDueCount: 0,
  };

  if (tenantId) {
    try {
      const counts = await getDashboardCounts(tenantId);
      customerCount = counts.customerCount;
      contractCount = counts.contractCount;
      assetCount = counts.assetCount;
      workOrderCount = counts.workOrderCount;
    } catch {
      /* ignore */
    }
    try {
      metrics = await getDashboardMetricTotals(tenantId, from, to);
    } catch {
      metrics = {
        maintenanceExpectedSlots: 0,
        maintenanceCoveredCount: 0,
        revenueByCurrency: [],
        failuresCreatedCount: 0,
        failuresUnsolvedCount: 0,
        periodicDueCount: 0,
      };
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
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.dashboard.rangeSection}</h2>
          <p className="mt-1 text-xs text-slate-500">{tr.dashboard.rangeHint}</p>
          <div className="mt-3">
            <DashboardRangeForm
              from={from}
              to={to}
              labels={{
                from: tr.dashboard.dateFrom,
                to: tr.dashboard.dateTo,
                apply: tr.dashboard.applyRange,
              }}
            />
          </div>
          {!sp.from && !sp.to ? (
            <p className="mt-2 text-xs text-slate-400">
              {tr.dashboard.defaultRangeNote}: {defaults.from} … {defaults.to}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.dashboard.dynamicMetrics}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={tr.dashboard.maintenanceExpected}
              value={metrics.maintenanceExpectedSlots}
              hint={tr.dashboard.maintenanceExpectedHint}
              href={metricHref("maintenance-expected", from, to)}
            />
            <StatCard
              label={tr.dashboard.maintenanceCovered}
              value={metrics.maintenanceCoveredCount}
              hint={tr.dashboard.maintenanceCoveredHint}
              href={metricHref("maintenance-covered", from, to)}
            />
            <StatCard
              label={tr.dashboard.revenuePayments}
              value={formatRevenueTotals(metrics.revenueByCurrency)}
              hint={tr.dashboard.revenuePaymentsHint}
              href={metricHref("revenue", from, to)}
            />
            <StatCard
              label={tr.dashboard.failuresTotal}
              value={metrics.failuresCreatedCount}
              hint={tr.dashboard.failuresTotalHint}
              href={metricHref("failures", from, to)}
            />
            <StatCard
              label={tr.dashboard.failuresOpen}
              value={metrics.failuresUnsolvedCount}
              hint={tr.dashboard.failuresOpenHint}
              variant={metrics.failuresUnsolvedCount > 0 ? "danger" : "default"}
              href={metricHref("failures-open", from, to)}
            />
            <StatCard
              label={tr.dashboard.periodicUpcoming}
              value={metrics.periodicDueCount}
              hint={tr.dashboard.periodicUpcomingHint}
              href={metricHref("periodic-upcoming", from, to)}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.dashboard.portfolio}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={tr.dashboard.customers} value={customerCount} />
            <StatCard label={tr.dashboard.contracts} value={contractCount} hint="Duruma göre filtre modülde" />
            <StatCard label={tr.dashboard.elevators} value={assetCount} />
            <StatCard label={tr.dashboard.workOrders} value={workOrderCount} />
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
