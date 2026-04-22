import { DataTableShell } from "@/components/module/data-table-shell";
import { listCustomers } from "@/lib/data/customers";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";

export default async function CustomersPage() {
  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;

  const customers = tenantId ? await listCustomers(tenantId) : [];

  return (
    <DataTableShell
      title={tr.customers.title}
      description={tr.customers.description}
      actions={
        <Link
          href="/app/customers/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.customers.new}
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.customers.code}</th>
              <th className="px-4 py-2">{tr.customers.name}</th>
              <th className="px-4 py-2">{tr.customers.status}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {customers.length ? (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                    {c.code ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{c.legal_name}</td>
                  <td className="px-4 py-2 capitalize text-slate-600 dark:text-slate-400">{c.status}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/app/customers/${c.id}`}
                      className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {tr.customers.open}
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                  {tr.customers.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
