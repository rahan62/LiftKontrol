import { DataTableShell } from "@/components/module/data-table-shell";
import { listProjects } from "@/lib/data/projects-data";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rows = await listProjects(ctx.tenantId);

  return (
    <DataTableShell
      title={tr.projects.title}
      description={tr.projects.description}
      actions={
        <Link
          href="/app/projects/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.projects.newProject}
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.projects.nameCol}</th>
              <th className="px-4 py-2">{tr.projects.typeCol}</th>
              <th className="px-4 py-2">{tr.projects.statusCol}</th>
              <th className="px-4 py-2">{tr.projects.customerCol}</th>
              <th className="px-4 py-2">{tr.projects.siteCol}</th>
              <th className="px-4 py-2">{tr.projects.specCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{p.project_type}</td>
                  <td className="px-4 py-2 capitalize text-slate-600">{p.status}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{p.customer_name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{p.site_name ?? "—"}</td>
                  <td className="px-4 py-2">
                    {p.spec_file_path ? (
                      <a
                        href={`/api/projects/${p.id}/spec`}
                        className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        {tr.projects.downloadSpec}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  {tr.projects.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
