"use client";

import { deleteCustomerAction } from "@/actions/customers";
import { deleteAssetAction } from "@/actions/assets";
import { deleteFinanceEntryAction } from "@/actions/finance";
import { deleteSiteAction } from "@/actions/sites";
import { tr } from "@/lib/i18n/tr";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ImplProps = {
  label: string;
  confirmMessage: string;
  /** When set, navigates after delete; otherwise only refreshes the current page. */
  redirectHref?: string;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
};

function DeleteButtonImpl({ label, confirmMessage, redirectHref, onDelete }: ImplProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
        onClick={async () => {
          if (!window.confirm(confirmMessage)) return;
          setPending(true);
          setError(null);
          const r = await onDelete();
          if (!r.ok) {
            setError(r.error ?? tr.deleteUi.failed);
            setPending(false);
            return;
          }
          if (redirectHref) {
            router.push(redirectHref);
          }
          router.refresh();
        }}
      >
        {pending ? tr.common.deleting : label}
      </button>
      {error ? <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span> : null}
    </div>
  );
}

export function DeleteCustomerButton({ id }: { id: string }) {
  return (
    <DeleteButtonImpl
      label={tr.deleteUi.genericLabel}
      confirmMessage={tr.deleteUi.customerConfirm}
      redirectHref="/app/customers"
      onDelete={() => deleteCustomerAction(id)}
    />
  );
}

export function DeleteSiteButton({ id }: { id: string }) {
  return (
    <DeleteButtonImpl
      label={tr.deleteUi.siteLabel}
      confirmMessage={tr.deleteUi.siteConfirm}
      redirectHref="/app/sites"
      onDelete={() => deleteSiteAction(id)}
    />
  );
}

export function DeleteAssetButton({ id }: { id: string }) {
  return (
    <DeleteButtonImpl
      label={tr.deleteUi.genericLabel}
      confirmMessage={tr.deleteUi.assetConfirm}
      redirectHref="/app/assets"
      onDelete={() => deleteAssetAction(id)}
    />
  );
}

export function DeleteFinanceEntryButton({ id }: { id: string }) {
  return (
    <DeleteButtonImpl
      label={tr.finances.deleteEntry}
      confirmMessage={tr.finances.deleteEntryConfirm}
      onDelete={() => deleteFinanceEntryAction(id)}
    />
  );
}
