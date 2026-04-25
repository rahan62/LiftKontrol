import { BillingAddressCard } from "@/components/display/billing-address";
import { DeleteCustomerButton } from "@/components/forms/delete-button";
import { DataTableShell } from "@/components/module/data-table-shell";
import { getCustomer } from "@/lib/data/customers";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) notFound();

  const customer = await getCustomer(ctx.tenantId, id);
  if (!customer) notFound();

  return (
    <DataTableShell
      title={String(customer.legal_name ?? tr.customers.detailFallbackTitle)}
      description={tr.customers.detailDescription}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/customers/${id}/edit`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
          >
            {tr.customers.edit}
          </Link>
          <Link
            href={`/app/sites/new?customer_id=${encodeURIComponent(id)}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.customers.addSite}
          </Link>
          <DeleteCustomerButton id={id} />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.customers.billingSection}</div>
          <div className="mt-2">
            <BillingAddressCard billing={customer.billing_address} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.customers.notesSection}</div>
          <p className="mt-2 text-slate-700 dark:text-slate-300">{String(customer.notes ?? "—")}</p>
        </div>
      </div>
    </DataTableShell>
  );
}
