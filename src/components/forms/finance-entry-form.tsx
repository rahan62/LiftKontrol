"use client";

import { createFinanceEntryAction } from "@/actions/finance";
import { FINANCE_ENTRY_TYPES } from "@/lib/domain/site-maintenance";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sites: { id: string; name: string }[];
  assets: { id: string; label: string }[];
  defaultSiteId?: string;
  defaultAssetId?: string;
};

export function FinanceEntryForm({ sites, assets, defaultSiteId, defaultAssetId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [scope, setScope] = useState<"site" | "elevator">(() => {
    if (defaultAssetId && assets.some((a) => a.id === defaultAssetId)) return "elevator";
    return "site";
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    try {
      const res = await createFinanceEntryAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/app/finances");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{tr.financeForm.title}</h1>
        <Link href="/app/finances" className="text-sm text-slate-600 hover:underline dark:text-slate-400">
          {tr.financeForm.back}
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="text-xs font-semibold uppercase text-slate-500">{tr.financeForm.appliesTo}</div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="scope_ui"
              checked={scope === "site"}
              onChange={() => setScope("site")}
            />
            {tr.financeForm.siteScope}
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="scope_ui"
              checked={scope === "elevator"}
              onChange={() => setScope("elevator")}
            />
            {tr.financeForm.elevatorScope}
          </label>
        </div>
        {scope === "site" ? (
          <div className="mt-3">
            <label className={label}>Saha *</label>
            <select name="site_id" required className={field} defaultValue={defaultSiteId ?? ""}>
              <option value="">{tr.financeForm.selectSite}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-3">
            <label className={label}>Asansör *</label>
            <select name="elevator_asset_id" required className={field} defaultValue={defaultAssetId ?? ""}>
              <option value="">{tr.financeForm.selectUnit}</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {!assets.length ? (
              <p className="mt-1 text-xs text-slate-500">{tr.financeForm.registerAssets}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{tr.financeForm.type}</label>
          <select name="entry_type" className={field} defaultValue="fee">
            {FINANCE_ENTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.financeForm.date}</label>
          <input name="occurred_on" type="date" required className={field} defaultValue={today} />
        </div>
        <div>
          <label className={label}>{tr.financeForm.amount}</label>
          <input name="amount" type="number" step="any" required className={field} placeholder="0.00" />
        </div>
        <div>
          <label className={label}>{tr.financeForm.currency}</label>
          <input name="currency" className={field} defaultValue="TRY" maxLength={3} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{tr.financeForm.description}</label>
          <input name="label" required className={field} placeholder={tr.financeForm.descriptionPlaceholder} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{tr.financeForm.notes}</label>
          <textarea name="notes" rows={3} className={field} />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? tr.financeForm.saving : tr.financeForm.save}
        </button>
        <Link href="/app/finances" className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">
          {tr.financeForm.cancel}
        </Link>
      </div>
    </form>
  );
}
