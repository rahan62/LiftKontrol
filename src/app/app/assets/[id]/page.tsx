import { ElevatorQrSvg } from "@/components/assets/elevator-qr-svg";
import { DeleteAssetButton, DeleteFinanceEntryButton } from "@/components/forms/delete-button";
import { DataTableShell } from "@/components/module/data-table-shell";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { ELEVATOR_TYPES } from "@/lib/domain/elevator-types";
import { EN8120_CONTROL_AUTHORITIES, MAINTENANCE_TRANSFER_BASES } from "@/lib/domain/en8120";
import { listFinanceEntriesForAsset } from "@/lib/data/finance";
import { formatMoneyAmount } from "@/lib/format/money";
import { getAssetWithSiteCustomer } from "@/lib/data/assets";
import { canonicalElevatorUrl } from "@/lib/elevator-qr";
import { entryTypeLabel, operationalStatusLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : "—";
}

function fmtDate(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s || "—";
}

function labelElevatorType(value: unknown): string {
  const s = value != null ? String(value) : "";
  const hit = ELEVATOR_TYPES.find((t) => t.value === s);
  return hit?.label ?? (s || "—");
}

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) notFound();

  const result = await getAssetWithSiteCustomer(ctx.tenantId, id);
  if (!result) notFound();

  const { asset, siteName, customerName } = result;
  const stopsStr = fmtNum(asset.stops);
  const capStr = fmtNum(asset.capacity_kg);
  const personsStr = fmtNum(asset.persons);
  const speedStr = fmtNum(asset.speed);
  const qrUrl =
    (typeof asset.qr_payload === "string" && asset.qr_payload.length > 0
      ? asset.qr_payload
      : null) ?? canonicalElevatorUrl(id);

  const feeRaw = asset.maintenance_fee;
  const feeNum = feeRaw !== null && feeRaw !== undefined ? Number(feeRaw) : NaN;
  const feeDisplay = Number.isFinite(feeNum) ? formatMoneyAmount(String(feeNum), "TRY") : "—";
  const feePer = asset.maintenance_fee_period ? String(asset.maintenance_fee_period) : null;
  const feePeriodLabel =
    feePer === "monthly" ? tr.assets.periodMonthly : feePer === "yearly" ? tr.assets.periodYearly : "—";

  let financeRows: Awaited<ReturnType<typeof listFinanceEntriesForAsset>> = [];
  try {
    financeRows = await listFinanceEntriesForAsset(ctx.tenantId, id);
  } catch {
    financeRows = [];
  }

  const unitTitle = `${tr.assets.unit} ${String(asset.unit_code ?? "").trim() || "—"}`;
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth() + 1;
  const siteIdStr = asset.site_id != null ? String(asset.site_id) : "";
  const unitCodeStr = String(asset.unit_code ?? "").trim();

  return (
    <DataTableShell
      title={unitTitle}
      description={tr.assets.detailDescription}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/assets/${id}/edit`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
          >
            {tr.common.edit}
          </Link>
          <Link
            href={`/app/maintenance?y=${calYear}&m=${calMonth}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.maintenance.addMaintenance}
          </Link>
          <Link
            href={`/app/work-orders/new?asset_id=${encodeURIComponent(id)}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.workOrders.newBreakdown}
          </Link>
          <Link
            href={`/app/maintenance/parts?asset_id=${encodeURIComponent(id)}&site_id=${encodeURIComponent(siteIdStr)}&unit_code=${encodeURIComponent(unitCodeStr)}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.maintenance.goToParts}
          </Link>
          <Link
            href={`/app/finances/new?asset_id=${encodeURIComponent(id)}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.finances.newEntry}
          </Link>
          <DeleteAssetButton id={id} />
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.assets.identitySection}</div>
          <dl className="mt-2 space-y-1 text-slate-800 dark:text-slate-200">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-slate-500">{tr.assets.uniqueId}</dt>
              <dd className="flex flex-wrap items-center gap-2 font-mono text-xs break-all">
                {id}
                <CopyTextButton text={id} />
              </dd>
            </div>
            <p className="text-xs text-slate-500">{tr.assets.idHint}</p>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.customer}</dt>
              <dd>{customerName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.site}</dt>
              <dd>
                {siteName ? (
                  <Link
                    href={`/app/sites/${String(asset.site_id)}`}
                    className="text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {siteName}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.serialNumber}</dt>
              <dd className="font-mono text-xs">{String(asset.serial_number ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.operationalStatus}</dt>
              <dd>
                {operationalStatusLabel(String(asset.operational_status ?? "")) || "—"}
                {asset.unsafe_flag ? (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                    {tr.assets.unsafe}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.assets.qrTitle}</div>
          <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ElevatorQrSvg url={qrUrl} />
            <div className="min-w-0 space-y-1">
              <p className="break-all text-xs text-slate-600 dark:text-slate-400">{qrUrl}</p>
              <CopyTextButton text={qrUrl} />
              <p className="text-xs text-slate-500">{tr.assets.qrHint}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="text-xs font-semibold uppercase text-slate-500">{tr.assets.maintenanceFeeSection}</div>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{tr.assets.maintenanceFeeAmount}</dt>
            <dd className="font-mono text-xs">{feeDisplay}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{tr.assets.feePeriodLabel}</dt>
            <dd>{feePeriodLabel}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          {feePer === "yearly" ? tr.assets.periodYearlyFinanceNote : tr.assets.maintenanceFeeHint}
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="text-xs font-semibold uppercase text-slate-500">{tr.assets.specsSection}</div>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.elevatorType}</dt>
            <dd className="text-slate-800 dark:text-slate-200">{labelElevatorType(asset.elevator_type)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.brand}</dt>
            <dd>{String(asset.brand ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.model}</dt>
            <dd>{String(asset.model ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.stops}</dt>
            <dd className="font-mono text-xs">{stopsStr}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.capacityKg}</dt>
            <dd className="font-mono text-xs">{capStr === "—" ? "—" : `${capStr} kg`}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.persons}</dt>
            <dd className="font-mono text-xs">{personsStr}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.speed}</dt>
            <dd className="font-mono text-xs">{speedStr === "—" ? "—" : `${speedStr} m/s`}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.controller}</dt>
            <dd>{String(asset.controller_type ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.drive}</dt>
            <dd>{String(asset.drive_type ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.door}</dt>
            <dd>{String(asset.door_type ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.commissionedAt}</dt>
            <dd className="font-mono text-xs">{fmtDate(asset.commissioned_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.assets.takeoverAt}</dt>
            <dd className="font-mono text-xs">{fmtDate(asset.takeover_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="text-xs font-semibold uppercase text-slate-500">{tr.en8120.sectionAsset}</div>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">{tr.en8120.controlAuthority}</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {asset.en8120_control_authority
                ? EN8120_CONTROL_AUTHORITIES.find((x) => x.value === asset.en8120_control_authority)?.label ??
                  String(asset.en8120_control_authority)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.en8120.privateCompanyName}</dt>
            <dd>{String(asset.private_control_company_name ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.en8120.nextControlDue}</dt>
            <dd>
              {asset.en8120_next_control_due ? String(asset.en8120_next_control_due).slice(0, 10) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tr.en8120.transferBasis}</dt>
            <dd>
              {asset.maintenance_transfer_basis
                ? MAINTENANCE_TRANSFER_BASES.find((x) => x.value === asset.maintenance_transfer_basis)?.label ??
                  String(asset.maintenance_transfer_basis)
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{tr.assets.financeThisElevator}</h2>
          <Link
            href={`/app/finances/new?asset_id=${encodeURIComponent(id)}`}
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
                    {tr.finances.noEntriesAsset}
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
