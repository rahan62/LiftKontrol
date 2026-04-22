"use client";

import { createCustomerAction, updateCustomerAction } from "@/actions/customers";
import { CUSTOMER_STATUSES } from "@/lib/domain/elevator-types";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Billing = {
  line1?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

type Props = {
  mode: "create" | "edit";
  customerId?: string;
  initial?: {
    legal_name: string;
    code: string | null;
    status: string;
    notes: string | null;
    billing_address: Billing | null;
  };
};

function billingDefaults(b: Billing | null | undefined) {
  return {
    addr_line1: b?.line1 ?? "",
    addr_city: b?.city ?? "",
    addr_region: b?.region ?? "",
    addr_postal: b?.postal_code ?? "",
    addr_country: b?.country ?? "",
  };
}

export function CustomerForm({ mode, customerId, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const b = billingDefaults(initial?.billing_address ?? undefined);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "create") {
        const res = await createCustomerAction(fd);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/app/customers/${res.id}`);
        router.refresh();
        return;
      }
      if (!customerId) return;
      const res = await updateCustomerAction(customerId, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/customers/${customerId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          {mode === "create" ? "New customer" : "Edit customer"}
        </h1>
        <Link href="/app/customers" className="text-sm text-slate-600 hover:underline dark:text-slate-400">
          Back to list
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Legal name *</label>
          <input
            name="legal_name"
            required
            className={field}
            defaultValue={initial?.legal_name ?? ""}
          />
        </div>
        <div>
          <label className={label}>Account code</label>
          <input name="code" className={field} defaultValue={initial?.code ?? ""} placeholder="Optional" />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" className={field} defaultValue={initial?.status ?? "active"}>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-slate-500">Billing address</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Line 1</label>
            <input name="addr_line1" className={field} defaultValue={b.addr_line1} />
          </div>
          <div>
            <label className={label}>City</label>
            <input name="addr_city" className={field} defaultValue={b.addr_city} />
          </div>
          <div>
            <label className={label}>Region / state</label>
            <input name="addr_region" className={field} defaultValue={b.addr_region} />
          </div>
          <div>
            <label className={label}>Postal code</label>
            <input name="addr_postal" className={field} defaultValue={b.addr_postal} />
          </div>
          <div>
            <label className={label}>Country</label>
            <input name="addr_country" className={field} defaultValue={b.addr_country} />
          </div>
        </div>
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          name="notes"
          rows={4}
          className={field}
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
        </button>
        <Link
          href={customerId ? `/app/customers/${customerId}` : "/app/customers"}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
