"use client";

import {
  submitPublicElevatorFaultAction,
  submitPublicElevatorTrappedAction,
} from "@/actions/public-elevator-help";
import { tr } from "@/lib/i18n/tr";
import { useState } from "react";

type Props = {
  assetId: string;
  unitCode: string | null;
  siteName: string | null;
};

export function PublicElevatorHelpPanel({ assetId, unitCode, siteName }: Props) {
  const [trapNotes, setTrapNotes] = useState("");
  const [faultText, setFaultText] = useState("");
  const [trapPending, setTrapPending] = useState(false);
  const [faultPending, setFaultPending] = useState(false);
  const [trapOk, setTrapOk] = useState<string | null>(null);
  const [faultOk, setFaultOk] = useState<string | null>(null);
  const [trapErr, setTrapErr] = useState<string | null>(null);
  const [faultErr, setFaultErr] = useState<string | null>(null);

  async function onTrapped(e: React.FormEvent) {
    e.preventDefault();
    setTrapErr(null);
    setTrapOk(null);
    setTrapPending(true);
    const res = await submitPublicElevatorTrappedAction(assetId, trapNotes);
    setTrapPending(false);
    if (!res.ok) {
      setTrapErr(res.error);
      return;
    }
    setTrapOk(res.number);
    setTrapNotes("");
  }

  async function onFault(e: React.FormEvent) {
    e.preventDefault();
    setFaultErr(null);
    setFaultOk(null);
    setFaultPending(true);
    const res = await submitPublicElevatorFaultAction(assetId, faultText);
    setFaultPending(false);
    if (!res.ok) {
      setFaultErr(res.error);
      return;
    }
    setFaultOk(res.number);
    setFaultText("");
  }

  return (
    <div className="space-y-10">
      <dl className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-slate-500">{tr.assets.unit}</dt>
          <dd className="font-mono font-medium text-slate-900 dark:text-slate-100">{unitCode ?? "—"}</dd>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          <dt className="text-slate-500">{tr.assets.site}</dt>
          <dd className="text-right text-slate-900 dark:text-slate-100">{siteName ?? tr.common.none}</dd>
        </div>
      </dl>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 dark:border-rose-900/60 dark:bg-rose-950/40">
        <h2 className="text-lg font-semibold text-rose-950 dark:text-rose-100">
          {tr.publicElevator.trappedSectionTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-rose-900/90 dark:text-rose-200/90">
          {tr.publicElevator.trappedSectionBody}
        </p>
        <form onSubmit={onTrapped} className="mt-5 space-y-4">
          <div>
            <label htmlFor="trap-notes" className="sr-only">
              {tr.publicElevator.optionalNotes}
            </label>
            <textarea
              id="trap-notes"
              value={trapNotes}
              onChange={(e) => setTrapNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={tr.publicElevator.optionalNotes}
              className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={trapPending}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-rose-600 px-4 text-base font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 dark:bg-rose-700 dark:hover:bg-rose-600"
          >
            {trapPending ? tr.common.loading : tr.publicElevator.trappedButton}
          </button>
          {trapErr ? (
            <p className="text-center text-sm text-rose-800 dark:text-rose-300" role="alert">
              {trapErr}
            </p>
          ) : null}
          {trapOk ? (
            <p className="text-center text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {tr.publicElevator.confirmReceived} {trapOk}
            </p>
          ) : null}
        </form>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {tr.publicElevator.faultSectionTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tr.publicElevator.faultSectionBody}</p>
        <form onSubmit={onFault} className="mt-4 space-y-3">
          <label htmlFor="fault-text" className="sr-only">
            {tr.publicElevator.faultLabel}
          </label>
          <textarea
            id="fault-text"
            required
            minLength={3}
            maxLength={4000}
            value={faultText}
            onChange={(e) => setFaultText(e.target.value)}
            rows={4}
            placeholder={tr.publicElevator.faultPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={faultPending}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {faultPending ? tr.common.loading : tr.publicElevator.faultSubmit}
          </button>
          {faultErr ? (
            <p className="text-center text-sm text-rose-700 dark:text-rose-400" role="alert">
              {faultErr}
            </p>
          ) : null}
          {faultOk ? (
            <p className="text-center text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {tr.publicElevator.confirmReceived} {faultOk}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
