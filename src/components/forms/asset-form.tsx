"use client";

import { createAssetAction, getSitesForCustomer, updateAssetAction } from "@/actions/assets";
import { DEFAULT_ELEVATOR_TYPE, ELEVATOR_TYPES, OPERATIONAL_STATUSES } from "@/lib/domain/elevator-types";
import { EN8120_CONTROL_AUTHORITIES, MAINTENANCE_TRANSFER_BASES } from "@/lib/domain/en8120";
import { ASSET_MAINTENANCE_FEE_PERIODS } from "@/lib/domain/asset-maintenance";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CustomerOption = { id: string; legal_name: string };

type SiteOption = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  assetId?: string;
  customers: CustomerOption[];
  /** Pre-selected customer (e.g. from query or parent page). */
  defaultCustomerId?: string;
  /** Pre-selected site when creating (e.g. from site detail). */
  defaultSiteId?: string;
  initial?: {
    customer_id: string;
    site_id: string;
    unit_code: string;
    elevator_type: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    controller_type: string | null;
    drive_type: string | null;
    door_type: string | null;
    stops: number | null;
    capacity_kg: number | null;
    persons: number | null;
    speed: number | null;
    operational_status: string;
    unsafe_flag: boolean;
    en8120_control_authority?: string | null;
    private_control_company_name?: string | null;
    en8120_next_control_due?: string | null;
    maintenance_transfer_basis?: string | null;
    maintenance_fee?: number | null;
    maintenance_fee_period?: string | null;
  };
  /** When editing, initial sites for the customer (avoid flash). */
  initialSites?: SiteOption[];
};

export function AssetForm({
  mode,
  assetId,
  customers,
  defaultCustomerId,
  defaultSiteId,
  initial,
  initialSites = [],
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const resolvedCustomerId =
    defaultCustomerId && customers.some((c) => c.id === defaultCustomerId)
      ? defaultCustomerId
      : initial?.customer_id && customers.some((c) => c.id === initial.customer_id)
        ? initial.customer_id
        : customers[0]?.id ?? "";

  const [customerId, setCustomerId] = useState(resolvedCustomerId);
  const [sites, setSites] = useState<SiteOption[]>(initialSites);

  useEffect(() => {
    if (!customerId) {
      setSites([]);
      return;
    }
    let cancelled = false;
    getSitesForCustomer(customerId).then((rows) => {
      if (!cancelled) setSites(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "create") {
        const res = await createAssetAction(fd);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/app/assets/${res.id}`);
        router.refresh();
        return;
      }
      if (!assetId) return;
      const res = await updateAssetAction(assetId, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/assets/${assetId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!customers.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-slate-600 dark:text-slate-400">{tr.assetForm.addCustomerAndSiteFirst}</p>
        <Link href="/app/customers/new" className="mt-4 inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-400">
          {tr.customers.new}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          {mode === "create" ? tr.assetForm.newElevator : tr.assetForm.editAsset}
        </h1>
        <Link href="/app/assets" className="text-sm text-slate-600 hover:underline dark:text-slate-400">
          {tr.formActions.backToList}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>{tr.assetForm.customerLabel}</label>
          <select
            name="customer_id"
            required
            className={field}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{tr.assetForm.siteLabel}</label>
          <select
            key={customerId}
            name="site_id"
            required
            className={field}
            defaultValue={
              mode === "edit" && customerId === initial?.customer_id
                ? (initial?.site_id ?? "")
                : mode === "create" && defaultSiteId && initialSites.some((s) => s.id === defaultSiteId)
                  ? defaultSiteId
                  : ""
            }
          >
            <option value="">{tr.assetForm.selectSite}</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!sites.length ? (
            <p className="mt-1 text-xs text-slate-500">{tr.assetForm.noSitesForCustomer}</p>
          ) : null}
        </div>
        <div>
          <label className={label}>{tr.assetForm.unitCode}</label>
          <input
            name="unit_code"
            required
            className={field}
            defaultValue={initial?.unit_code ?? ""}
            placeholder={tr.assetForm.unitCodePlaceholder}
          />
        </div>
        <div>
          <label className={label}>{tr.assetForm.elevatorType}</label>
          <select
            name="elevator_type"
            className={field}
            defaultValue={initial?.elevator_type ?? DEFAULT_ELEVATOR_TYPE}
          >
            {initial?.elevator_type &&
            !ELEVATOR_TYPES.some((t) => t.value === initial.elevator_type) ? (
              <option value={initial.elevator_type}>
                {initial.elevator_type.replace(/_/g, " ")} (eski kayıt)
              </option>
            ) : null}
            {ELEVATOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.assetForm.brand}</label>
          <input name="brand" className={field} defaultValue={initial?.brand ?? ""} />
        </div>
        <div>
          <label className={label}>{tr.assetForm.model}</label>
          <input name="model" className={field} defaultValue={initial?.model ?? ""} />
        </div>
        <div>
          <label className={label}>{tr.assetForm.serialNumber}</label>
          <input name="serial_number" className={field} defaultValue={initial?.serial_number ?? ""} />
        </div>
        <div>
          <label className={label}>{tr.assetForm.controller}</label>
          <input name="controller_type" className={field} defaultValue={initial?.controller_type ?? ""} />
        </div>
        <div>
          <label className={label}>{tr.assetForm.drive}</label>
          <input name="drive_type" className={field} defaultValue={initial?.drive_type ?? ""} />
        </div>
        <div>
          <label className={label}>{tr.assetForm.doors}</label>
          <input name="door_type" className={field} defaultValue={initial?.door_type ?? ""} />
        </div>
        <div>
          <label className={label}>{tr.assetForm.stops}</label>
          <input
            name="stops"
            type="number"
            min={0}
            className={field}
            defaultValue={initial?.stops ?? ""}
          />
        </div>
        <div>
          <label className={label}>{tr.assetForm.capacityKg}</label>
          <input
            name="capacity_kg"
            type="number"
            min={0}
            className={field}
            defaultValue={initial?.capacity_kg ?? ""}
          />
        </div>
        <div>
          <label className={label}>{tr.assetForm.persons}</label>
          <input
            name="persons"
            type="number"
            min={0}
            className={field}
            defaultValue={initial?.persons ?? ""}
          />
        </div>
        <div>
          <label className={label}>{tr.assetForm.speed}</label>
          <input name="speed" type="number" step="any" className={field} defaultValue={initial?.speed ?? ""} />
        </div>

        <div className="sm:col-span-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.assets.maintenanceFeeSection}</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.assets.maintenanceFeeHint}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>{tr.assets.maintenanceFeeAmount}</label>
              <input
                name="maintenance_fee"
                type="number"
                step="any"
                min={0}
                className={field}
                defaultValue={initial?.maintenance_fee ?? ""}
                placeholder="0"
              />
            </div>
            <div>
              <label className={label}>{tr.assets.maintenanceFeePeriod}</label>
              <select
                name="maintenance_fee_period"
                className={field}
                defaultValue={initial?.maintenance_fee_period ?? ""}
              >
                {ASSET_MAINTENANCE_FEE_PERIODS.map((p) => (
                  <option key={p.value || "none"} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500">{tr.assets.periodYearlyFinanceNote}</p>
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.en8120.sectionAsset}</div>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>{tr.en8120.controlAuthority}</label>
              <select
                name="en8120_control_authority"
                className={field}
                defaultValue={initial?.en8120_control_authority ?? ""}
              >
                <option value="">—</option>
                {EN8120_CONTROL_AUTHORITIES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>{tr.en8120.privateCompanyName}</label>
              <input
                name="private_control_company_name"
                className={field}
                defaultValue={initial?.private_control_company_name ?? ""}
                placeholder="Özel kuruluş seçildiyse"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>{tr.en8120.nextControlDue}</label>
              <input
                name="en8120_next_control_due"
                type="date"
                className={field}
                defaultValue={initial?.en8120_next_control_due?.slice(0, 10) ?? ""}
              />
              <p className="mt-1 text-xs text-slate-500">{tr.en8120.nextControlDueHint}</p>
            </div>
            <div>
              <label className={label}>{tr.en8120.transferBasis}</label>
              <select
                name="maintenance_transfer_basis"
                className={field}
                defaultValue={initial?.maintenance_transfer_basis ?? ""}
              >
                <option value="">—</option>
                {MAINTENANCE_TRANSFER_BASES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500">
              {MAINTENANCE_TRANSFER_BASES[0].description} / {MAINTENANCE_TRANSFER_BASES[1].description}
            </p>
          </div>
        </div>

        <div>
          <label className={label}>{tr.assetForm.operationalStatus}</label>
          <select
            name="operational_status"
            className={field}
            defaultValue={initial?.operational_status ?? "in_service"}
          >
            {OPERATIONAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              name="unsafe_flag"
              defaultChecked={initial?.unsafe_flag ?? false}
              className="rounded border-slate-300"
            />
            {tr.assetForm.markUnsafe}
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? tr.formActions.saving : mode === "create" ? tr.assetForm.createAsset : tr.formActions.saveChanges}
        </button>
        <Link
          href={assetId ? `/app/assets/${assetId}` : "/app/assets"}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      </div>
    </form>
  );
}
