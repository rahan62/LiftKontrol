import { RevisionWorkflowPanel } from "@/components/revisions/revision-workflow-panel";
import { DataTableShell } from "@/components/module/data-table-shell";
import { formatMoneyAmount } from "@/lib/format/money";
import { getElevatorRevision } from "@/lib/data/elevator-revisions";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function RevisionDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rev = await getElevatorRevision(ctx.tenantId, id);
  if (!rev) notFound();

  return (
    <DataTableShell
      title={`${tr.revisions.title} — ${rev.unit_code}`}
      description={tr.revisions.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {rev.offer_pdf_path ? (
            <a
              href={`/api/revisions/${id}/offer`}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
            >
              {tr.revisions.downloadPdf}
            </a>
          ) : null}
          {rev.second_control_report_path ? (
            <a
              href={`/api/revisions/${id}/second-report`}
              className="rounded-md border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100"
            >
              {tr.revisions.downloadSecondReport}
            </a>
          ) : null}
          <Link
            href={`/app/assets/${rev.elevator_asset_id}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            {tr.assets.unit}
          </Link>
          <Link href="/app/revisions" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">
            {tr.common.cancel}
          </Link>
        </div>
      }
    >
      <RevisionWorkflowPanel rev={rev} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">Özet</div>
          <dl className="mt-2 space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.customers.name}</dt>
              <dd>{rev.customer_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.assets.site}</dt>
              <dd>{rev.site_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{tr.revisions.total}</dt>
              <dd className="font-mono font-semibold">{formatMoneyAmount(rev.total_fee_try, "TRY")}</dd>
            </div>
            {rev.periodic_control_id ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{tr.periodicControls.title}</dt>
                <dd>
                  <Link
                    href={`/app/periodic-controls/${rev.periodic_control_id}`}
                    className="text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {tr.assets.open}
                  </Link>
                </dd>
              </div>
            ) : null}
            {rev.deadline_at ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{tr.revisions.deadline}</dt>
                <dd className="font-mono text-xs">{rev.deadline_at}</dd>
              </div>
            ) : null}
            {rev.agreed_target_ticket ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{tr.revisions.agreedTargetTicket}</dt>
                <dd className="capitalize">{rev.agreed_target_ticket}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">Not</div>
          <p className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{rev.notes ?? "—"}</p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{tr.revisions.lines}</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Kod</th>
                <th className="px-4 py-2">{tr.revisions.ticketTier}</th>
                <th className="px-4 py-2">Başlık</th>
                <th className="px-4 py-2 text-right">{tr.finances.amount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rev.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 font-mono text-xs text-amber-700 dark:text-amber-400">{l.article_code}</td>
                  <td className="px-4 py-2 text-xs capitalize text-slate-600">{l.ticket_tier}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{l.title}</div>
                    {l.description ? (
                      <div className="mt-1 line-clamp-3 text-xs text-slate-500">{l.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoneyAmount(l.unit_price_try, "TRY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DataTableShell>
  );
}
