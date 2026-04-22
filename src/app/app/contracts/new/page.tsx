import { createContractAction } from "@/actions/contracts";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listCustomers } from "@/lib/data/customers";
import { MAINTENANCE_TRANSFER_BASES } from "@/lib/domain/en8120";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewContractPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const customers = await listCustomers(ctx.tenantId);

  return (
    <DataTableShell
      title={tr.contracts.newContract}
      description={tr.contracts.description}
      actions={
        <Link
          href="/app/contracts"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      }
    >
      <form action={createContractAction} className="mx-auto max-w-xl space-y-4">
        <div>
          <label className={label}>Müşteri *</label>
          <select name="customer_id" required className={field} defaultValue="">
            <option value="">Seçin…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} · ` : ""}
                {c.legal_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.contracts.titleCol} *</label>
          <input name="title" required className={field} placeholder="Örn. 2026 bakım sözleşmesi" />
        </div>
        <div>
          <label className={label}>{tr.contracts.counterparty}</label>
          <input
            name="counterparty_name"
            className={field}
            placeholder="Site yönetimi veya yönetim şirketi adı"
          />
        </div>
        <div>
          <label className={label}>{tr.contracts.transferBasis}</label>
          <select name="maintenance_transfer_basis" className={field} defaultValue="">
            <option value="">—</option>
            {MAINTENANCE_TRANSFER_BASES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {MAINTENANCE_TRANSFER_BASES[0].description} {MAINTENANCE_TRANSFER_BASES[1].description}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>{tr.contracts.start} *</label>
            <input name="start_at" type="date" required className={field} />
          </div>
          <div>
            <label className={label}>{tr.contracts.end}</label>
            <input name="end_at" type="date" className={field} />
          </div>
        </div>
        <div>
          <label className={label}>{tr.contracts.file}</label>
          <input name="file" type="file" className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1 dark:text-slate-400 dark:file:bg-slate-800" />
          <p className="mt-1 text-xs text-slate-500">
            Ortamda S3 tanımlıysa bucket’a yazılır; aksi halde yerel uploads/contracts.
          </p>
        </div>
        <button type="submit" className={btnPrimary}>
          {tr.common.save}
        </button>
      </form>
    </DataTableShell>
  );
}
