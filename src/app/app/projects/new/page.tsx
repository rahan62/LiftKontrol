import { createProjectAction } from "@/actions/projects";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listCustomers } from "@/lib/data/customers";
import { listSites } from "@/lib/data/sites";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const [customers, sites] = await Promise.all([listCustomers(ctx.tenantId), listSites(ctx.tenantId)]);

  return (
    <DataTableShell
      title={tr.projects.newTitle}
      description={tr.projects.formDescription}
      actions={
        <Link
          href="/app/projects"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      }
    >
      <form action={createProjectAction} className="mx-auto max-w-xl space-y-4">
        <div>
          <label className={label}>{tr.projects.customerCol} *</label>
          <select name="customer_id" required className={field} defaultValue="">
            <option value="">Seçin…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} · ` : ""}
                {c.legal_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.projects.siteCol} *</label>
          <select name="site_id" required className={field} defaultValue="">
            <option value="">Seçin…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.customer_name ? `${s.customer_name} — ` : ""}
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{tr.projects.siteMustMatchCustomer}</p>
        </div>
        <div>
          <label className={label}>{tr.projects.nameCol} *</label>
          <input name="name" required className={field} placeholder={tr.projects.namePlaceholder} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>{tr.projects.typeCol}</label>
            <select name="project_type" className={field} defaultValue="assembly">
              <option value="assembly">{tr.projects.typeAssembly}</option>
              <option value="modernization">{tr.projects.typeModernization}</option>
              <option value="repair">{tr.projects.typeRepair}</option>
              <option value="other">{tr.projects.typeOther}</option>
            </select>
          </div>
          <div>
            <label className={label}>{tr.projects.statusCol}</label>
            <select name="status" className={field} defaultValue="planning">
              <option value="planning">{tr.projects.statusPlanning}</option>
              <option value="active">{tr.projects.statusActive}</option>
              <option value="completed">{tr.projects.statusCompleted}</option>
              <option value="cancelled">{tr.projects.statusCancelled}</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>{tr.projects.plannedStart}</label>
            <input name="planned_start" type="date" className={field} />
          </div>
          <div>
            <label className={label}>{tr.projects.plannedEnd}</label>
            <input name="planned_end" type="date" className={field} />
          </div>
        </div>
        <div>
          <label className={label}>{tr.projects.notes}</label>
          <textarea name="notes" rows={3} className={field} />
        </div>
        <div>
          <label className={label}>{tr.projects.specFile}</label>
          <input name="spec" type="file" className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1 dark:text-slate-400 dark:file:bg-slate-800" />
          <p className="mt-1 text-xs text-slate-500">{tr.projects.specHint}</p>
        </div>
        <button type="submit" className={btnPrimary}>
          {tr.common.save}
        </button>
      </form>
    </DataTableShell>
  );
}
