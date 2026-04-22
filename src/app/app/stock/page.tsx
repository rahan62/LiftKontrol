import { DataTableShell } from "@/components/module/data-table-shell";
import { listStockItems } from "@/lib/data/stock";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";

export default async function StockPage() {
  const ctx = await getTenantContext();
  const tenantId = ctx?.tenantId;

  const items = tenantId ? await listStockItems(tenantId, 500) : [];

  return (
    <DataTableShell
      title={tr.stock.title}
      description={tr.stock.description}
      actions={
        <Link
          href="/app/stock/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.stock.newItem}
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.stock.sku}</th>
              <th className="px-4 py-2">{tr.stock.descriptionCol}</th>
              <th className="px-4 py-2">{tr.stock.subsystem}</th>
              <th className="px-4 py-2">{tr.stock.category}</th>
              <th className="px-4 py-2">{tr.stock.manufacturer}</th>
              <th className="px-4 py-2">{tr.stock.oem}</th>
              <th className="px-4 py-2">{tr.stock.minMax}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.length ? (
              items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-mono text-xs">{s.sku}</td>
                  <td className="px-4 py-2">{s.description}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{s.subsystem ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{s.part_category ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{s.manufacturer ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.oem_part_number ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {s.min_qty ?? "—"} / {s.max_qty ?? "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  Henüz stok kalemi yok. «{tr.stock.newItem}» ile ekleyin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
