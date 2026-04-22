import { createTenantDocumentAction } from "@/actions/tenant-documents";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listCustomers } from "@/lib/data/customers";
import { listProjectOptions } from "@/lib/data/projects-data";
import { listSites } from "@/lib/data/sites";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewDocumentPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const [customers, sites, projects] = await Promise.all([
    listCustomers(ctx.tenantId),
    listSites(ctx.tenantId),
    listProjectOptions(ctx.tenantId),
  ]);

  return (
    <DataTableShell
      title={tr.documents.newTitle}
      description={tr.documents.formDescription}
      actions={
        <Link
          href="/app/documents"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      }
    >
      <form action={createTenantDocumentAction} className="mx-auto max-w-xl space-y-4">
        <div>
          <label className={label}>{tr.documents.titleCol} *</label>
          <input name="title" required className={field} />
        </div>
        <div>
          <label className={label}>{tr.documents.descriptionCol}</label>
          <textarea name="description" rows={2} className={field} />
        </div>
        <div>
          <label className={label}>{tr.documents.fileCol} *</label>
          <input name="file" type="file" required className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1 dark:text-slate-400 dark:file:bg-slate-800" />
        </div>
        <div>
          <label className={label}>{tr.projects.customerCol}</label>
          <select name="customer_id" className={field} defaultValue="">
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.projects.siteCol}</label>
          <select name="site_id" className={field} defaultValue="">
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.customer_name ? `${s.customer_name} — ` : ""}
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{tr.documents.siteRequiresCustomer}</p>
        </div>
        <div>
          <label className={label}>{tr.documents.projectCol}</label>
          <select name="project_id" className={field} defaultValue="">
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btnPrimary}>
          {tr.common.save}
        </button>
      </form>
    </DataTableShell>
  );
}
