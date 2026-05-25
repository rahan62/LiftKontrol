"use client";

import {
  createRevisionArticleAction,
  updateRevisionArticleAction,
} from "@/actions/revision-articles";
import { TicketTierSwatch } from "@/components/en8120/ticket-tier-swatch";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { tr } from "@/lib/i18n/tr";
import type { RevisionArticleRow } from "@/lib/data/revision-articles";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

const TICKET_OPTIONS = [
  { value: "green", label: "Yeşil (tam uyum / kritik)" },
  { value: "blue", label: "Mavi" },
  { value: "yellow", label: "Sarı (güvensiz, kullanılabilir)" },
  { value: "red", label: "Kırmızı (güvensiz, kullanılamaz)" },
];

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
          >
            {tr.common.cancel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function RevisionArticlesClient({ initialRows }: { initialRows: RevisionArticleRow[] }) {
  const router = useRouter();
  const rows = initialRows;

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RevisionArticleRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editDefaults = useMemo(() => editing, [editing]);

  async function submitCreate(fd: FormData) {
    setError(null);
    setPending(true);
    try {
      const res = await createRevisionArticleAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCreateOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function submitUpdate(fd: FormData) {
    if (!editing) return;
    setError(null);
    setPending(true);
    try {
      const res = await updateRevisionArticleAction(editing.id, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {tr.en8120.revisionArticleNew}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">{tr.en8120.revisionArticleCodeCol}</th>
              <th className="px-4 py-2">{tr.revisions.ticketTier}</th>
              <th className="px-4 py-2">{tr.en8120.revisionArticleTitleCol}</th>
              <th className="px-4 py-2 text-right">{tr.en8120.revisionArticleTryCol}</th>
              <th className="w-28 px-4 py-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-mono text-xs">{r.article_code}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center py-0.5">
                      <TicketTierSwatch tier={r.ticket_tier} />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.title}</div>
                    {r.description ? <div className="text-xs text-slate-500">{r.description}</div> : null}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{r.default_cost_try ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditing(r);
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                    >
                      {tr.common.edit}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  {tr.en8120.revisionArticlesEmpty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <ModalShell title={tr.en8120.revisionArticleNew} onClose={() => setCreateOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCreate(new FormData(e.currentTarget));
            }}
          >
            <div>
              <label className={label}>{tr.en8120.revisionArticleCode} *</label>
              <input name="article_code" required className={field} placeholder="ör. R-5.2" />
            </div>
            <div>
              <label className={label}>{tr.en8120.revisionArticleTitle} *</label>
              <input name="title" required className={field} />
            </div>
            <div>
              <label className={label}>{tr.en8120.revisionArticleDescription}</label>
              <textarea name="description" rows={2} className={field} />
            </div>
            <div>
              <label className={label}>{tr.en8120.revisionArticleDefaultCost}</label>
              <input name="default_cost_try" type="number" step="any" min={0} className={field} />
            </div>
            <div>
              <label className={label}>{tr.revisions.ticketTier}</label>
              <select name="ticket_tier" className={field} defaultValue="green">
                {TICKET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <button type="submit" className={btnPrimary} disabled={pending}>
              {pending ? tr.common.loading : tr.common.save}
            </button>
          </form>
        </ModalShell>
      ) : null}

      {editDefaults ? (
        <ModalShell title={tr.en8120.revisionArticleEdit} onClose={() => setEditing(null)}>
          <form
            className="mt-4 space-y-3"
            key={editDefaults.id}
            onSubmit={(e) => {
              e.preventDefault();
              void submitUpdate(new FormData(e.currentTarget));
            }}
          >
            <div>
              <label className={label}>{tr.en8120.revisionArticleCode} *</label>
              <input
                name="article_code"
                required
                className={field}
                defaultValue={editDefaults.article_code}
              />
            </div>
            <div>
              <label className={label}>{tr.en8120.revisionArticleTitle} *</label>
              <input name="title" required className={field} defaultValue={editDefaults.title} />
            </div>
            <div>
              <label className={label}>{tr.en8120.revisionArticleDescription}</label>
              <textarea
                name="description"
                rows={2}
                className={field}
                defaultValue={editDefaults.description ?? ""}
              />
            </div>
            <div>
              <label className={label}>{tr.en8120.revisionArticleDefaultCost}</label>
              <input
                name="default_cost_try"
                type="number"
                step="any"
                min={0}
                className={field}
                defaultValue={editDefaults.default_cost_try ?? ""}
              />
            </div>
            <div>
              <label className={label}>{tr.revisions.ticketTier}</label>
              <select name="ticket_tier" className={field} defaultValue={editDefaults.ticket_tier}>
                {TICKET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <button type="submit" className={btnPrimary} disabled={pending}>
              {pending ? tr.common.loading : tr.common.save}
            </button>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
