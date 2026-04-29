import { DataTableShell } from "@/components/module/data-table-shell";
import { listAssets } from "@/lib/data/assets";
import { operationalStatusLabel } from "@/lib/i18n/display-labels";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";

export default async function AssetsPage() {
  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;

  const assets = tenantId ? await listAssets(tenantId) : [];

  return (
    <DataTableShell
      title={tr.assets.title}
      description={tr.assets.description}
      actions={
        <Link
          href="/app/assets/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.assets.newAsset}
        </Link>
      }
    >
      {assets.length ? (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-950">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2">{tr.assets.unit}</th>
                  <th className="px-4 py-2">{tr.assets.site}</th>
                  <th className="px-4 py-2">{tr.assets.uniqueId}</th>
                  <th className="px-4 py-2">{tr.assets.brandModel}</th>
                  <th className="px-4 py-2">{tr.assets.status}</th>
                  <th className="px-4 py-2">{tr.assets.flags}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-4 py-2 font-mono text-xs">{a.unit_code}</td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                      {a.site_name ? (
                        <Link
                          href={`/app/sites/${a.site_id}`}
                          className="hover:text-amber-700 hover:underline dark:hover:text-amber-400"
                        >
                          {a.site_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">{a.id}</td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                      {(a.brand ?? "—") + " · " + (a.model ?? "—")}
                    </td>
                    <td className="px-4 py-2">{operationalStatusLabel(a.operational_status)}</td>
                    <td className="px-4 py-2">
                      {a.unsafe_flag ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                          {tr.assets.unsafe}
                        </span>
                      ) : (
                        <span className="text-slate-400">{tr.common.none}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/app/assets/${a.id}`}
                        className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        {tr.assets.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {assets.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{a.unit_code}</div>
                    <div className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="text-xs font-semibold uppercase text-slate-500">{tr.assets.site}: </span>
                      {a.site_name ? (
                        <Link
                          href={`/app/sites/${a.site_id}`}
                          className="text-amber-700 hover:underline dark:text-amber-400"
                        >
                          {a.site_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {(a.brand ?? "—") + " · " + (a.model ?? "—")}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span>
                        <span className="font-semibold text-slate-500">{tr.assets.status}: </span>
                        {operationalStatusLabel(a.operational_status)}
                      </span>
                      {a.unsafe_flag ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                          {tr.assets.unsafe}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400" title={a.id}>
                      {a.id}
                    </p>
                  </div>
                  <Link
                    href={`/app/assets/${a.id}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-amber-600/35 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  >
                    {tr.assets.open}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          {tr.assets.empty}
        </div>
      )}
    </DataTableShell>
  );
}
