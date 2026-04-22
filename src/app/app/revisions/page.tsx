import { DataTableShell } from "@/components/module/data-table-shell";
import { formatMoneyAmount } from "@/lib/format/money";
import { listElevatorRevisions } from "@/lib/data/elevator-revisions";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RevisionsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rows = await listElevatorRevisions(ctx.tenantId);

  return (
    <DataTableShell title={tr.revisions.title} description={tr.revisions.description}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.assets.unit}</th>
              <th className="px-4 py-2">{tr.assets.site}</th>
              <th className="px-4 py-2">{tr.finances.date}</th>
              <th className="px-4 py-2">{tr.revisions.approval}</th>
              <th className="px-4 py-2">{tr.revisions.finalTicket}</th>
              <th className="px-4 py-2 text-right">{tr.revisions.total}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-2 font-mono text-xs">{r.unit_code}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{r.site_name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{r.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-2 capitalize text-xs text-slate-600">{r.approval_status}</td>
                  <td className="px-4 py-2 text-xs">{r.final_ticket ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {formatMoneyAmount(r.total_fee_try, "TRY")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/app/revisions/${r.id}`}
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
                  {tr.revisions.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
