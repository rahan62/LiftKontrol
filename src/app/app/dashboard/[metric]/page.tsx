import { DataTableShell } from "@/components/module/data-table-shell";
import { resolveDashboardRange } from "@/lib/dashboard-range";
import {
  isDashboardMetricSlug,
  listDashboardFailures,
  listDashboardFailuresOpen,
  listDashboardMaintenanceCovered,
  listDashboardMaintenanceExpected,
  listDashboardPeriodicUpcoming,
  listDashboardRevenuePayments,
} from "@/lib/data/dashboard-metrics";
import { formatMoneyAmount } from "@/lib/format/money";
import { workOrderStatusLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function DashboardMetricDrilldownPage({ params, searchParams }: Props) {
  const { metric } = await params;
  if (!isDashboardMetricSlug(metric)) notFound();

  const sp = await searchParams;
  const { from, to } = resolveDashboardRange(sp.from, sp.to);

  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;
  if (!tenantId) notFound();

  const q = new URLSearchParams({ from, to }).toString();
  const rangeLabel = `${from} → ${to}`;

  switch (metric) {
    case "maintenance-expected": {
      const rows = await listDashboardMaintenanceExpected(tenantId, from, to);
      return (
        <DataTableShell
          title={tr.dashboard.maintenanceExpected}
          description={`${rangeLabel}. ${tr.dashboard.maintenanceExpectedHint} ${tr.dashboard.listLimitNote}`}
          actions={
            <Link
              href={`/app?${q}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              {tr.dashboard.backToDashboard}
            </Link>
          }
        >
          <MetricTable
            headers={[tr.assets.unit, tr.dashboard.colDueMonth, tr.dashboard.colSite, tr.dashboard.colCustomer, ""]}
            rows={rows.map((r) => ({
              key: `${r.asset_id}-${r.due_month}`,
              cells: [
                r.unit_code,
                String(r.due_month).slice(0, 10),
                r.site_name ?? "—",
                r.customer_name ?? "—",
                <Link
                  key="l"
                  href={`/app/assets/${r.asset_id}`}
                  className="font-medium text-amber-800 hover:underline dark:text-amber-300"
                >
                  {tr.assets.open}
                </Link>,
              ],
            }))}
          />
        </DataTableShell>
      );
    }
    case "maintenance-covered": {
      const rows = await listDashboardMaintenanceCovered(tenantId, from, to);
      return (
        <DataTableShell
          title={tr.dashboard.maintenanceCovered}
          description={`${rangeLabel}. ${tr.dashboard.maintenanceCoveredHint} ${tr.dashboard.listLimitNote}`}
          actions={
            <Link
              href={`/app?${q}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              {tr.dashboard.backToDashboard}
            </Link>
          }
        >
          <MetricTable
            headers={[
              tr.assets.unit,
              tr.dashboard.colCompletedAt,
              tr.dashboard.colYearMonth,
              tr.dashboard.colSite,
              tr.dashboard.colCustomer,
            ]}
            rows={rows.map((r) => ({
              key: r.id,
              cells: [
                r.unit_code,
                String(r.completed_at).slice(0, 16).replace("T", " "),
                String(r.year_month).slice(0, 10),
                r.site_name ?? "—",
                r.customer_name ?? "—",
              ],
            }))}
          />
        </DataTableShell>
      );
    }
    case "revenue": {
      const rows = await listDashboardRevenuePayments(tenantId, from, to);
      return (
        <DataTableShell
          title={tr.dashboard.revenuePayments}
          description={`${rangeLabel}. ${tr.dashboard.revenuePaymentsHint} ${tr.dashboard.listLimitNote}`}
          actions={
            <Link
              href={`/app?${q}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              {tr.dashboard.backToDashboard}
            </Link>
          }
        >
          <MetricTable
            headers={[
              tr.dashboard.colOccurredOn,
              tr.dashboard.colAmount,
              tr.dashboard.colPaymentLabel,
              tr.assets.unit,
              "",
            ]}
            rows={rows.map((r) => ({
              key: r.id,
              cells: [
                String(r.occurred_on).slice(0, 10),
                formatMoneyAmount(r.amount, r.currency),
                r.label,
                r.unit_code ?? "—",
                <Link key="l" href="/app/accounting/receivables" className="font-medium text-amber-800 hover:underline dark:text-amber-300">
                  {tr.finances.title}
                </Link>,
              ],
            }))}
          />
        </DataTableShell>
      );
    }
    case "failures": {
      const rows = await listDashboardFailures(tenantId, from, to);
      return (
        <DataTableShell
          title={tr.dashboard.failuresTotal}
          description={`${rangeLabel}. ${tr.dashboard.failuresTotalHint} ${tr.dashboard.listLimitNote}`}
          actions={
            <Link
              href={`/app?${q}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              {tr.dashboard.backToDashboard}
            </Link>
          }
        >
          <MetricTable
            headers={[
              tr.dashboard.colWoNumber,
              tr.dashboard.colWoStatus,
              tr.dashboard.colCreatedAt,
              tr.assets.unit,
              tr.dashboard.colSite,
              "",
            ]}
            rows={rows.map((r) => ({
              key: r.id,
              cells: [
                r.number,
                workOrderStatusLabel(r.status) || r.status,
                String(r.created_at).slice(0, 16).replace("T", " "),
                r.unit_code ?? "—",
                r.site_name ?? "—",
                <Link
                  key="l"
                  href={`/app/work-orders/${r.id}`}
                  className="font-medium text-amber-800 hover:underline dark:text-amber-300"
                >
                  {tr.assets.open}
                </Link>,
              ],
            }))}
          />
        </DataTableShell>
      );
    }
    case "failures-open": {
      const rows = await listDashboardFailuresOpen(tenantId, from, to);
      return (
        <DataTableShell
          title={tr.dashboard.failuresOpen}
          description={`${rangeLabel}. ${tr.dashboard.failuresOpenHint} ${tr.dashboard.listLimitNote}`}
          actions={
            <Link
              href={`/app?${q}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              {tr.dashboard.backToDashboard}
            </Link>
          }
        >
          <MetricTable
            headers={[
              tr.dashboard.colWoNumber,
              tr.dashboard.colWoStatus,
              tr.dashboard.colCreatedAt,
              tr.assets.unit,
              tr.dashboard.colSite,
              "",
            ]}
            rows={rows.map((r) => ({
              key: r.id,
              cells: [
                r.number,
                workOrderStatusLabel(r.status) || r.status,
                String(r.created_at).slice(0, 16).replace("T", " "),
                r.unit_code ?? "—",
                r.site_name ?? "—",
                <Link
                  key="l"
                  href={`/app/work-orders/${r.id}`}
                  className="font-medium text-amber-800 hover:underline dark:text-amber-300"
                >
                  {tr.assets.open}
                </Link>,
              ],
            }))}
          />
        </DataTableShell>
      );
    }
    case "periodic-upcoming": {
      const rows = await listDashboardPeriodicUpcoming(tenantId, from, to);
      return (
        <DataTableShell
          title={tr.dashboard.periodicUpcoming}
          description={`${rangeLabel}. ${tr.dashboard.periodicUpcomingHint} ${tr.dashboard.listLimitNote}`}
          actions={
            <Link
              href={`/app?${q}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              {tr.dashboard.backToDashboard}
            </Link>
          }
        >
          <MetricTable
            headers={[
              tr.assets.unit,
              tr.dashboard.colSite,
              tr.dashboard.colCustomer,
              tr.en8120.nextControlDue,
              tr.dashboard.colDaysLeft,
              "",
            ]}
            rows={rows.map((r) => ({
              key: r.asset_id,
              cells: [
                r.unit_code,
                r.site_name ?? "—",
                r.customer_name ?? "—",
                String(r.next_control_due).slice(0, 10),
                String(r.days_until_due),
                <Link
                  key="l"
                  href={`/app/assets/${r.asset_id}`}
                  className="font-medium text-amber-800 hover:underline dark:text-amber-300"
                >
                  {tr.assets.open}
                </Link>,
              ],
            }))}
          />
        </DataTableShell>
      );
    }
    default:
      notFound();
  }
}

function MetricTable(props: {
  headers: string[];
  rows: { key: string; cells: (string | ReactNode)[] }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            {props.headers.map((h, hi) => (
              <th key={hi} className="px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {props.rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={props.headers.length}>
                —
              </td>
            </tr>
          ) : (
            props.rows.map((r) => (
              <tr key={r.key}>
                {r.cells.map((cell, i) => (
                  <td key={i} className="px-4 py-2 text-slate-800 dark:text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
