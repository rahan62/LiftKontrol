import { DataTableShell } from "@/components/module/data-table-shell";
import { listContracts } from "@/lib/data/contracts-data";
import { MAINTENANCE_TRANSFER_BASES } from "@/lib/domain/en8120";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ContractsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rows = await listContracts(ctx.tenantId);

  return (
    <DataTableShell
      title={tr.contracts.title}
      description={tr.contracts.description}
      actions={
        <Link
          href="/app/contracts/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.contracts.newContract}
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.contracts.titleCol}</th>
              <th className="px-4 py-2">{tr.contracts.counterparty}</th>
              <th className="px-4 py-2">Durum</th>
              <th className="px-4 py-2">{tr.contracts.start}</th>
              <th className="px-4 py-2">{tr.contracts.end}</th>
              <th className="px-4 py-2">{tr.contracts.transferCol}</th>
              <th className="px-4 py-2">Dosya</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{c.title}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{c.counterparty_name ?? "—"}</td>
                  <td className="px-4 py-2 capitalize text-slate-600">{c.status}</td>
                  <td className="px-4 py-2 text-xs">{c.start_at}</td>
                  <td className="px-4 py-2 text-xs">{c.end_at ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {c.maintenance_transfer_basis
                      ? MAINTENANCE_TRANSFER_BASES.find((x) => x.value === c.maintenance_transfer_basis)
                          ?.label ?? c.maintenance_transfer_basis
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {c.stored_file_path ? (
                      <a
                        href={`/api/contracts/${c.id}/file`}
                        className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        İndir
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  Henüz sözleşme yok. «{tr.contracts.newContract}» ile ekleyin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
