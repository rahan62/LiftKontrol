"use client";

/** GET `/app` with `from` / `to` (`yyyy-MM-dd`). */

type Labels = { from: string; to: string; apply: string };

export function DashboardRangeForm(props: { from: string; to: string; labels: Labels }) {
  return (
    <form action="/app" method="get" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        {props.labels.from}
        <input
          type="date"
          name="from"
          defaultValue={props.from}
          required
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        {props.labels.to}
        <input
          type="date"
          name="to"
          defaultValue={props.to}
          required
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {props.labels.apply}
      </button>
    </form>
  );
}
