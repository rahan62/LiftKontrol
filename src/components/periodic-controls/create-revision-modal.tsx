"use client";

import { createElevatorRevisionAction } from "@/actions/elevator-revisions";
import type { RevisionArticleRow } from "@/lib/data/revision-articles";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  periodicControlId: string;
  articles: RevisionArticleRow[];
  onClose: () => void;
};

function parseCost(s: string | null): number {
  if (s == null || s === "") return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function CreateRevisionModal({ open, periodicControlId, articles, onClose }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return articles;
    return articles.filter(
      (a) =>
        a.article_code.toLowerCase().includes(s) ||
        a.title.toLowerCase().includes(s) ||
        (a.description ?? "").toLowerCase().includes(s),
    );
  }, [articles, q]);

  const previewTotal = useMemo(() => {
    let t = 0;
    for (const id of selected) {
      const a = articles.find((x) => x.id === id);
      if (a) t += parseCost(a.default_cost_try);
    }
    return t;
  }, [articles, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submit() {
    setError(null);
    if (selected.size === 0) {
      setError("En az bir madde seçin.");
      return;
    }
    setPending(true);
    const res = await createElevatorRevisionAction({
      periodicControlId,
      revisionArticleIds: Array.from(selected),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    window.location.href = `/app/revisions/${res.revisionId}`;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tr.revisions.revisionModalTitle}</h3>
          <p className="mt-1 text-xs text-slate-500">{tr.revisions.pickArticles}</p>
        </div>
        <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
          <label className={label}>{tr.revisions.searchArticles}</label>
          <input className={field} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            {filtered.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer gap-2 rounded-md px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="mt-1 rounded border-slate-300"
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-mono text-xs text-amber-700 dark:text-amber-400">{a.article_code}</span>{" "}
                    <span className="rounded bg-slate-100 px-1 text-[10px] uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {a.ticket_tier}
                    </span>{" "}
                    <span className="text-slate-900 dark:text-slate-100">{a.title}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      {parseCost(a.default_cost_try).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!filtered.length ? (
            <p className="px-2 py-6 text-center text-sm text-slate-500">{tr.common.none}</p>
          ) : null}
        </div>
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{tr.revisions.previewTotal}</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {previewTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </span>
          </div>
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={pending} onClick={() => void submit()}>
              {pending ? tr.common.loading : tr.revisions.create}
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
              onClick={onClose}
            >
              {tr.common.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
