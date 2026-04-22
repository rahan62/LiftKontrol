import { createPeriodicControlAction } from "@/actions/periodic-controls";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listAssetOptionsWithSite } from "@/lib/data/assets";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewPeriodicControlPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const assets = await listAssetOptionsWithSite(ctx.tenantId);

  return (
    <DataTableShell
      title={tr.periodicControls.new}
      description={tr.periodicControls.description}
      actions={
        <Link
          href="/app/periodic-controls"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      }
    >
      <form action={createPeriodicControlAction} className="mx-auto max-w-xl space-y-4">
        <div>
          <label className={label}>{tr.assets.unit} *</label>
          <select name="elevator_asset_id" required className={field} defaultValue="">
            <option value="">{tr.financeForm.selectUnit}</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.site_name ? `${a.site_name} · ` : ""}
                {a.unit_code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.periodicControls.controlDate} *</label>
          <input name="control_date" type="date" required className={field} />
        </div>
        <div>
          <label className={label}>{tr.periodicControls.issuer}</label>
          <input name="issuer_name" className={field} placeholder="Örn. TSE, SZUTEST" />
        </div>
        <div>
          <label className={label}>{tr.periodicControls.formFile} *</label>
          <input name="file" type="file" accept="application/pdf" required className={field} />
        </div>
        <div>
          <label className={label}>{tr.periodicControls.notes}</label>
          <textarea name="notes" rows={3} className={field} />
        </div>
        <button type="submit" className={btnPrimary}>
          {tr.common.save}
        </button>
      </form>
    </DataTableShell>
  );
}
