import { BillingAddressCard } from "@/components/display/billing-address";
import { DeleteFinanceEntryButton, DeleteSiteButton } from "@/components/forms/delete-button";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listAssetsForSite } from "@/lib/data/assets";
import { listFinanceEntriesForSite } from "@/lib/data/finance";
import { formatMoneyAmount } from "@/lib/format/money";
import { getSite } from "@/lib/data/sites";
import { entryTypeLabel, operationalStatusLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function SiteDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const site = await getSite(ctx.tenantId, id);
  if (!site) notFound();

  const addr = site.service_address;

  let financeRows: Awaited<ReturnType<typeof listFinanceEntriesForSite>> = [];
  try {
    financeRows = await listFinanceEntriesForSite(ctx.tenantId, id);
  } catch {
    financeRows = [];
  }

  let siteAssets: Awaited<ReturnType<typeof listAssetsForSite>> = [];
  try {
    siteAssets = await listAssetsForSite(ctx.tenantId, id);
  } catch {
    siteAssets = [];
  }

  function feePeriodLabel(p: string | null) {
    if (p === "monthly") return tr.assets.periodMonthly;
    if (p === "yearly") return tr.assets.periodYearly;
    return tr.common.none;
  }

  return (
    <DataTableShell
      title={String(site.name ?? tr.sites.fallbackName)}
      description={tr.sites.detailDescription}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/assets/new?site_id=${encodeURIComponent(id)}&customer_id=${encodeURIComponent(String(site.customer_id ?? ""))}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.assets.newAsset}
          </Link>
          <Link
            href={`/app/sites/${id}/edit`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
          >
            {tr.common.edit}
          </Link>
          <Link
            href={`/app/finances/new?site_id=${encodeURIComponent(id)}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.sites.addFinanceEntry}
          </Link>
          <DeleteSiteButton id={id} />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.sites.detailMaintenanceCard}</div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tr.sites.periodicFeeOnElevatorsHint}</p>
          <div className="mt-2">
            <div className="text-xs text-slate-500">{tr.sites.maintenanceNotesLabel}</div>
            <div className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {site.maintenance_notes ? String(site.maintenance_notes) : tr.common.none}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.sites.serviceAddress}</div>
          <div className="mt-2">
            <BillingAddressCard billing={addr} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {tr.sites.billingSameAsService}: {site.billing_same_as_service ? tr.common.yes : tr.common.no}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.sites.accessSection}</div>
          <dl className="mt-2 space-y-2 text-slate-700 dark:text-slate-300">
            <div>
              <dt className="text-xs text-slate-500">{tr.sites.accessInstructions}</dt>
              <dd className="mt-0.5">{String(site.access_instructions ?? tr.common.none)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{tr.sites.machineRoom}</dt>
              <dd className="mt-0.5">{String(site.machine_room_notes ?? tr.common.none)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{tr.sites.shaft}</dt>
              <dd className="mt-0.5">{String(site.shaft_notes ?? tr.common.none)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{tr.sites.emergencyPhones}</dt>
              <dd className="mt-0.5">{String(site.emergency_phones ?? tr.common.none)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{tr.assets.siteElevators}</h2>
          <Link
            href={`/app/assets/new?site_id=${encodeURIComponent(id)}&customer_id=${encodeURIComponent(String(site.customer_id ?? ""))}`}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            {tr.assets.newAsset}
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">{tr.assets.unit}</th>
                <th className="px-4 py-2">{tr.assets.uniqueId}</th>
                <th className="px-4 py-2">{tr.assets.brandModel}</th>
                <th className="px-4 py-2">{tr.assets.status}</th>
                <th className="px-4 py-2">{tr.assets.maintenanceFeeAmount}</th>
                <th className="px-4 py-2">{tr.assets.feePeriodLabel}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {siteAssets.length ? (
                siteAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-4 py-2 font-mono text-xs">{a.unit_code}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{a.id}</td>
                    <td className="px-4 py-2">
                      {(a.brand ?? "—") + " · " + (a.model ?? "—")}
                    </td>
                    <td className="px-4 py-2">{operationalStatusLabel(a.operational_status)}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {a.maintenance_fee != null && Number.isFinite(a.maintenance_fee)
                        ? formatMoneyAmount(String(a.maintenance_fee), "TRY")
                        : tr.common.none}
                    </td>
                    <td className="px-4 py-2 text-xs">{feePeriodLabel(a.maintenance_fee_period)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/app/assets/${a.id}`}
                        className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        {tr.assets.open}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    {tr.assets.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{tr.sites.financeThisSite}</h2>
          <Link
            href={`/app/finances/new?site_id=${encodeURIComponent(id)}`}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            {tr.finances.newEntry}
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">{tr.finances.date}</th>
                <th className="px-4 py-2">{tr.finances.type}</th>
                <th className="px-4 py-2">{tr.finances.descriptionCol}</th>
                <th className="px-4 py-2 text-right">{tr.finances.amount}</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {financeRows.length ? (
                financeRows.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-xs text-slate-600">{e.occurred_on}</td>
                    <td className="px-4 py-2 text-slate-600">{entryTypeLabel(e.entry_type)}</td>
                    <td className="px-4 py-2">{e.label}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {formatMoneyAmount(e.amount, e.currency)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <DeleteFinanceEntryButton id={e.id} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    {tr.finances.noEntriesForSite}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DataTableShell>
  );
}
