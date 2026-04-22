"use client";

import { createSiteAction, geocodeSiteFromAddressAction, updateSiteAction } from "@/actions/sites";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Addr = {
  line1?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

type CustomerOption = { id: string; legal_name: string };

type Props = {
  mode: "create" | "edit";
  siteId?: string;
  customers: CustomerOption[];
  defaultCustomerId?: string;
  initial?: {
    customer_id: string;
    name: string;
    service_address: Addr | null;
    billing_same_as_service: boolean;
    access_instructions: string | null;
    machine_room_notes: string | null;
    shaft_notes: string | null;
    emergency_phones: string | null;
    maintenance_notes: string | null;
    geo_lat?: string;
    geo_lng?: string;
  };
};

function addrDefaults(a: Addr | null | undefined) {
  return {
    addr_line1: a?.line1 ?? "",
    addr_city: a?.city ?? "",
    addr_region: a?.region ?? "",
    addr_postal: a?.postal_code ?? "",
    addr_country: a?.country ?? "",
  };
}

export function SiteForm({ mode, siteId, customers, defaultCustomerId, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [geoLat, setGeoLat] = useState(() => initial?.geo_lat ?? "");
  const [geoLng, setGeoLng] = useState(() => initial?.geo_lng ?? "");
  const [geoFetchPending, setGeoFetchPending] = useState(false);
  const [geoFetchFeedback, setGeoFetchFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const a = addrDefaults(initial?.service_address ?? undefined);

  useEffect(() => {
    setGeoLat(initial?.geo_lat ?? "");
    setGeoLng(initial?.geo_lng ?? "");
  }, [initial?.geo_lat, initial?.geo_lng]);
  const defaultCust =
    defaultCustomerId && customers.some((c) => c.id === defaultCustomerId)
      ? defaultCustomerId
      : (initial?.customer_id ?? customers[0]?.id ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "create") {
        const res = await createSiteAction(fd);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/app/sites/${res.id}`);
        router.refresh();
        return;
      }
      if (!siteId) return;
      const res = await updateSiteAction(siteId, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/sites/${siteId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!customers.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Add a customer first, then you can create sites for them.
        </p>
        <Link href="/app/customers/new" className="mt-4 inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-400">
          New customer
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          {mode === "create" ? "New site / building" : "Edit site"}
        </h1>
        <Link href="/app/sites" className="text-sm text-slate-600 hover:underline dark:text-slate-400">
          Back to list
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Customer *</label>
          <select name="customer_id" required className={field} defaultValue={defaultCust}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Site name *</label>
          <input name="name" required className={field} defaultValue={initial?.name ?? ""} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="text-xs font-semibold uppercase text-slate-500">{tr.sites.maintenanceNotesSection}</div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.sites.maintenanceFeeOnAssetHint}</p>
        <div className="mt-3">
          <label className={label}>{tr.sites.maintenanceNotesLabel}</label>
          <textarea
            name="maintenance_notes"
            rows={4}
            className={field}
            defaultValue={initial?.maintenance_notes ?? ""}
            placeholder={tr.sites.maintenanceNotesPlaceholder}
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-slate-500">Service address</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Line 1</label>
            <input name="addr_line1" className={field} defaultValue={a.addr_line1} />
          </div>
          <div>
            <label className={label}>City</label>
            <input name="addr_city" className={field} defaultValue={a.addr_city} />
          </div>
          <div>
            <label className={label}>Region / state</label>
            <input name="addr_region" className={field} defaultValue={a.addr_region} />
          </div>
          <div>
            <label className={label}>Postal code</label>
            <input name="addr_postal" className={field} defaultValue={a.addr_postal} />
          </div>
          <div>
            <label className={label}>Country</label>
            <input name="addr_country" className={field} defaultValue={a.addr_country} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            name="billing_same_as_service"
            defaultChecked={initial?.billing_same_as_service ?? true}
            className="rounded border-slate-300"
          />
          Billing address same as service address
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="text-xs font-semibold uppercase text-slate-500">{tr.sites.geoSection}</div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.sites.geoHint}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>{tr.sites.geoLat}</label>
            <input
              name="geo_lat"
              className={field}
              placeholder="41.0082"
              value={geoLat}
              onChange={(e) => setGeoLat(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{tr.sites.geoLng}</label>
            <input
              name="geo_lng"
              className={field}
              placeholder="28.9784"
              value={geoLng}
              onChange={(e) => setGeoLng(e.target.value)}
            />
          </div>
        </div>
        {mode === "edit" && siteId ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.sites.geoFetchUsesSavedAddress}</p>
            <button
              type="button"
              disabled={geoFetchPending || pending}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={async () => {
                setGeoFetchFeedback(null);
                setError(null);
                setGeoFetchPending(true);
                try {
                  const res = await geocodeSiteFromAddressAction(siteId);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  if (res.hit) {
                    setGeoLat(String(res.lat));
                    setGeoLng(String(res.lng));
                    setGeoFetchFeedback({ ok: true, text: tr.sites.geoFetchOk(res.lat, res.lng) });
                    router.refresh();
                  } else {
                    setGeoFetchFeedback({ ok: false, text: tr.sites.geoFetchNoHit });
                  }
                } finally {
                  setGeoFetchPending(false);
                }
              }}
            >
              {geoFetchPending ? tr.sites.geoFetchBusy : tr.sites.geoFetchFromAddress}
            </button>
            {geoFetchFeedback ? (
              <p
                className={
                  geoFetchFeedback.ok
                    ? "text-sm text-emerald-700 dark:text-emerald-400"
                    : "text-sm text-amber-800 dark:text-amber-300"
                }
              >
                {geoFetchFeedback.text}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{tr.sites.geoFetchNeedSave}</p>
        )}
      </div>

      <div>
        <label className={label}>Access instructions</label>
        <textarea
          name="access_instructions"
          rows={3}
          className={field}
          defaultValue={initial?.access_instructions ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Machine room notes</label>
          <textarea
            name="machine_room_notes"
            rows={3}
            className={field}
            defaultValue={initial?.machine_room_notes ?? ""}
          />
        </div>
        <div>
          <label className={label}>Shaft notes</label>
          <textarea name="shaft_notes" rows={3} className={field} defaultValue={initial?.shaft_notes ?? ""} />
        </div>
      </div>
      <div>
        <label className={label}>Emergency phones</label>
        <input
          name="emergency_phones"
          className={field}
          defaultValue={initial?.emergency_phones ?? ""}
          placeholder="Numbers or extensions"
        />
      </div>

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : mode === "create" ? "Create site" : "Save changes"}
        </button>
        <Link
          href={siteId ? `/app/sites/${siteId}` : "/app/sites"}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
