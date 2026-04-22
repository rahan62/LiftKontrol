import { DataTableShell } from "@/components/module/data-table-shell";
import { listTenantDocuments } from "@/lib/data/tenant-documents-data";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rows = await listTenantDocuments(ctx.tenantId);

  return (
    <DataTableShell
      title={tr.documents.title}
      description={tr.documents.description}
      actions={
        <Link
          href="/app/documents/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.documents.upload}
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.documents.titleCol}</th>
              <th className="px-4 py-2">{tr.documents.linkedCol}</th>
              <th className="px-4 py-2">{tr.documents.dateCol}</th>
              <th className="px-4 py-2">{tr.documents.fileCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((d) => {
                const linked = [d.customer_name, d.site_name, d.project_name].filter(Boolean).join(" · ") || "—";
                return (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{d.title}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{linked}</td>
                    <td className="px-4 py-2 text-xs">{String(d.created_at).slice(0, 16).replace("T", " ")}</td>
                    <td className="px-4 py-2">
                      <a
                        href={`/api/documents/${d.id}/file`}
                        className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        {tr.documents.download}
                      </a>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                  {tr.documents.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
