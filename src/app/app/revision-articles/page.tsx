import { createRevisionArticleAction } from "@/actions/revision-articles";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listRevisionArticles } from "@/lib/data/revision-articles";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function RevisionArticlesPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rows = await listRevisionArticles(ctx.tenantId);

  return (
    <DataTableShell
      title={tr.en8120.revisionArticles}
      description={tr.en8120.revisionArticlesHint}
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <form action={createRevisionArticleAction} className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.common.add}</div>
          <div>
            <label className={label}>Madde kodu *</label>
            <input name="article_code" required className={field} placeholder="ör. R-5.2" />
          </div>
          <div>
            <label className={label}>Başlık *</label>
            <input name="title" required className={field} />
          </div>
          <div>
            <label className={label}>Açıklama</label>
            <textarea name="description" rows={2} className={field} />
          </div>
          <div>
            <label className={label}>Varsayılan maliyet (TRY)</label>
            <input name="default_cost_try" type="number" step="any" min={0} className={field} />
          </div>
          <div>
            <label className={label}>{tr.revisions.ticketTier}</label>
            <select name="ticket_tier" className={field} defaultValue="green">
              <option value="green">Yeşil (tam uyum / kritik)</option>
              <option value="blue">Mavi</option>
              <option value="yellow">Sarı (güvensiz, kullanılabilir)</option>
              <option value="red">Kırmızı (güvensiz, kullanılamaz)</option>
            </select>
          </div>
          <button type="submit" className={btnPrimary}>
            {tr.common.save}
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Kod</th>
                <th className="px-4 py-2">{tr.revisions.ticketTier}</th>
                <th className="px-4 py-2">Başlık</th>
                <th className="px-4 py-2 text-right">TRY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-mono text-xs">{r.article_code}</td>
                    <td className="px-4 py-2 text-xs capitalize text-slate-600">{r.ticket_tier}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.title}</div>
                      {r.description ? (
                        <div className="text-xs text-slate-500">{r.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {r.default_cost_try ?? "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    Henüz madde yok. Revizyon gerektiğinde kullanılacak kalemleri ekleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DataTableShell>
  );
}
