import { PeriodicControlDetailClient } from "@/components/periodic-controls/periodic-control-detail-client";
import { DataTableShell } from "@/components/module/data-table-shell";
import { getPeriodicControl } from "@/lib/data/periodic-controls";
import { listRevisionArticles } from "@/lib/data/revision-articles";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function PeriodicControlDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const row = await getPeriodicControl(ctx.tenantId, id);
  if (!row) notFound();

  const articles = await listRevisionArticles(ctx.tenantId);

  return (
    <DataTableShell
      title={`${tr.periodicControls.title} — ${row.unit_code}`}
      description={tr.periodicControls.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/api/periodic-controls/${id}/form`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.periodicControls.openForm}
          </Link>
          <PeriodicControlDetailClient periodicControlId={id} articles={articles} />
          <Link
            href="/app/periodic-controls"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.common.cancel}
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">Kontrol</div>
          <dl className="mt-2 space-y-2 text-slate-800 dark:text-slate-200">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.unit}</dt>
              <dd className="font-mono text-xs">
                <Link href={`/app/assets/${row.elevator_asset_id}`} className="text-amber-700 hover:underline dark:text-amber-400">
                  {row.unit_code}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.customers.name}</dt>
              <dd>{row.customer_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.site}</dt>
              <dd>{row.site_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.periodicControls.controlDate}</dt>
              <dd>{row.control_date}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.periodicControls.issuer}</dt>
              <dd>{row.issuer_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{tr.periodicControls.notes}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{row.notes ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">EN 81-20</div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {tr.revisions.description} {tr.en8120.revisionArticles} listesinden madde seçerek revizyon teklifi oluşturun.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {articles.length === 0
              ? `Önce «${tr.nav.revisionArticles}» sayfasından maddeleri ekleyin.`
              : `${articles.length} madde katalogda.`}
          </p>
        </div>
      </div>
    </DataTableShell>
  );
}
