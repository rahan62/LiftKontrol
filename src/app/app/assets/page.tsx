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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
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
            {assets.length ? (
              assets.map((a) => (
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
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  {tr.assets.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
