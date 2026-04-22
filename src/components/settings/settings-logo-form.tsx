"use client";

import { clearTenantLogoAction, uploadTenantLogoAction } from "@/actions/tenant-logo";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { hasLogo: boolean };

export function SettingsLogoForm({ hasLogo }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await uploadTenantLogoAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function onClear() {
    setPending(true);
    await clearTenantLogoAction();
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase text-slate-500">{tr.settingsBranding.logoTitle}</div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tr.settingsBranding.logoHint}</p>
      {hasLogo ? (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/tenant/logo"
            alt="Logo"
            className="max-h-24 max-w-xs object-contain"
          />
        </div>
      ) : null}
      <form onSubmit={onUpload} className="mt-4 space-y-3">
        <div>
          <label className={label}>{tr.settingsBranding.uploadLogo}</label>
          <input name="logo" type="file" accept="image/png,image/jpeg" className={field} required />
          <p className="mt-1 text-xs text-slate-500">{tr.settingsBranding.logoTypes}</p>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? tr.common.loading : tr.settingsBranding.uploadLogo}
          </button>
          {hasLogo ? (
            <button
              type="button"
              disabled={pending}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
              onClick={() => void onClear()}
            >
              {tr.settingsBranding.removeLogo}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
