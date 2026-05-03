import Link from "next/link";
import { formatMoneyAmount } from "@/lib/format/money";
import {
  listScopeOutstandingForCustomer,
} from "@/lib/data/accounting";
import { listFinanceEntriesForCustomer } from "@/lib/data/finance";
import { getCustomer } from "@/lib/data/customers";
import { entryTypeLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect, notFound } from "next/navigation";
import { DeleteFinanceEntryButton } from "@/components/forms/delete-button";
import { FinanceMarkPaidButton } from "@/components/finance/finance-mark-paid-button";

export default async function CustomerLedgerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const { customerId } = await params;
  const customer = await getCustomer(ctx.tenantId, customerId);
  if (!customer) notFound();

  const legalName = String(customer.legal_name ?? "");
  let scopes: Awaited<ReturnType<typeof listScopeOutstandingForCustomer>> = [];
  let entries: Awaited<ReturnType<typeof listFinanceEntriesForCustomer>> = [];
  try {
    scopes = await listScopeOutstandingForCustomer(ctx.tenantId, customerId);
  } catch {
    scopes = [];
  }
  try {
    entries = await listFinanceEntriesForCustomer(ctx.tenantId, customerId);
  } catch {
    entries = [];
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">{tr.accounting.currentAccounts}</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{legalName}</h2>
        </div>
        <Link
          href={`/app/customers/${customerId}`}
          className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
        >
          {tr.accounting.linkCustomerProfile}
        </Link>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{tr.accounting.scopeSplit}</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">{tr.accounting.scopeCol}</th>
                <th className="px-4 py-2">{tr.finances.descriptionCol}</th>
                <th className="px-4 py-2 text-right">{tr.accounting.outstandingCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {scopes.length ? (
                scopes.map((s) => (
                  <tr key={`${s.scopeKind}-${s.scope_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {s.scopeKind === "site" ? tr.accounting.siteRow : tr.accounting.assetRow}
                    </td>
                    <td className="px-4 py-2">
                      {s.scopeKind === "site" ? (
                        <Link href={`/app/sites/${s.scope_id}`} className="font-medium text-amber-700 hover:underline dark:text-amber-400">
                          {s.label}
                        </Link>
                      ) : (
                        <Link href={`/app/assets/${s.scope_id}`} className="font-medium text-amber-700 hover:underline dark:text-amber-400">
                          {s.label}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(s.outstanding, s.currency)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                    {tr.common.none}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{tr.accounting.allMovements}</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">{tr.finances.date}</th>
                <th className="px-4 py-2">{tr.finances.scope}</th>
                <th className="px-4 py-2">{tr.finances.type}</th>
                <th className="px-4 py-2">{tr.finances.descriptionCol}</th>
                <th className="px-4 py-2 text-right">{tr.finances.amount}</th>
                <th className="px-4 py-2">{tr.finances.payment}</th>
                <th className="w-40 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {entries.length ? (
                entries.map((e) => {
                  const paid = e.payment_status === "paid";
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-600 dark:text-slate-400">{e.occurred_on}</td>
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{e.scope_label}</td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{entryTypeLabel(e.entry_type)}</td>
                      <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{e.label}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(e.amount, e.currency)}</td>
                      <td className="px-4 py-2">
                        {paid ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                            {tr.common.paid}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            {tr.common.unpaid}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <FinanceMarkPaidButton id={e.id} paid={paid} />
                          <DeleteFinanceEntryButton id={e.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    {tr.finances.noEntries}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
