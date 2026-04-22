"use client";

import {
  approveRevisionAction,
  markRevisionPurchasingDoneAction,
  markRevisionWorkCompleteAction,
  markRevisionWorkStartedAction,
  recordRevisionDownPaymentAction,
  scheduleRevisionWorkAction,
  submitFinalInspectionAction,
  uploadRevisionSecondReportAction,
} from "@/actions/revision-workflow";
import type { ElevatorRevisionDetail } from "@/lib/data/elevator-revisions";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TIER_LABEL: Record<string, string> = {
  green: "Yeşil",
  blue: "Mavi",
  yellow: "Sarı",
  red: "Kırmızı",
};

const TICKET_ORDER: { value: string; label: string }[] = [
  { value: "green", label: "Yeşil" },
  { value: "blue", label: "Mavi" },
  { value: "yellow", label: "Sarı" },
  { value: "red", label: "Kırmızı" },
];

function ticketBadgeClass(t: string | null): string {
  switch (t) {
    case "green":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
    case "blue":
      return "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100";
    case "yellow":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100";
    case "red":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

type Props = { rev: ElevatorRevisionDetail };

export function RevisionWorkflowPanel({ rev }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedTicket, setAgreedTicket] = useState(rev.agreed_target_ticket ?? "green");
  const [scheduleDate, setScheduleDate] = useState(rev.scheduled_work_at ?? "");
  const [fulfilled, setFulfilled] = useState<Set<string>>(() => new Set(rev.final_fulfilled_article_ids));
  const [dpAmount, setDpAmount] = useState("");
  const [dpDate, setDpDate] = useState(() => new Date().toISOString().slice(0, 10));

  const approved = rev.approval_status === "approved";
  const canApprove = rev.approval_status === "pending" && Boolean(rev.offer_pdf_path);
  const canPurchasingMark = approved && !rev.purchasing_completed_at;
  const canWorkStartMark = approved && Boolean(rev.purchasing_completed_at) && !rev.work_started_at;
  const canSchedule =
    approved && Boolean(rev.work_started_at) && !rev.work_completed_at && !rev.final_inspection_at;
  const canMarkDone =
    approved &&
    Boolean(rev.purchasing_completed_at) &&
    Boolean(rev.work_started_at) &&
    Boolean(rev.scheduled_work_at) &&
    !rev.work_completed_at &&
    !rev.final_inspection_at;
  const canUploadSecond =
    Boolean(rev.work_completed_at) && !rev.second_control_report_path && !rev.final_inspection_at;
  const canFinal =
    Boolean(rev.work_completed_at) &&
    Boolean(rev.second_control_report_path) &&
    !rev.final_inspection_at;

  function toggleFulfilled(id: string) {
    setFulfilled((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function approve(yes: boolean) {
    setError(null);
    setPending(true);
    const res = await approveRevisionAction(rev.id, yes, yes ? agreedTicket : null);
    setPending(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function schedule() {
    setError(null);
    setPending(true);
    const res = await scheduleRevisionWorkAction(rev.id, scheduleDate);
    setPending(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function markDone() {
    setError(null);
    setPending(true);
    const res = await markRevisionWorkCompleteAction(rev.id);
    setPending(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function purchasingDone() {
    setError(null);
    setPending(true);
    const res = await markRevisionPurchasingDoneAction(rev.id);
    setPending(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function workStarted() {
    setError(null);
    setPending(true);
    const res = await markRevisionWorkStartedAction(rev.id);
    setPending(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function addDownPayment() {
    setError(null);
    setPending(true);
    const res = await recordRevisionDownPaymentAction(rev.id, dpAmount, dpDate);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.financeEntryId) {
      router.push(`/app/finances?createdFee=${encodeURIComponent(res.financeEntryId)}`);
      return;
    }
    router.refresh();
  }

  async function submitFinal() {
    setError(null);
    setPending(true);
    const res = await submitFinalInspectionAction(rev.id, Array.from(fulfilled));
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.financeEntryId) {
      router.push(`/app/finances?createdFee=${encodeURIComponent(res.financeEntryId)}`);
      return;
    }
    router.refresh();
  }

  async function onUploadSecond(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await uploadRevisionSecondReportAction(fd);
    setPending(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase text-slate-500">{tr.revisions.workflowTitle}</div>
      <p className="text-xs text-slate-500">{tr.revisions.workflowHint}</p>
      <p className="text-xs text-amber-800 dark:text-amber-200/90">{tr.revisions.ticketHierarchyHint}</p>

      {rev.needs_rework ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {tr.revisions.needsReworkHint}
        </p>
      ) : null}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">{tr.revisions.approval}</dt>
          <dd className="capitalize">{rev.approval_status}</dd>
        </div>
        {rev.deadline_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.deadline}</dt>
            <dd className="font-mono text-xs">{rev.deadline_at}</dd>
          </div>
        ) : null}
        {rev.agreed_target_ticket ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.agreedTargetTicket}</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex rounded px-2 py-1 text-sm font-medium ${ticketBadgeClass(rev.agreed_target_ticket)}`}
              >
                {TIER_LABEL[rev.agreed_target_ticket] ?? rev.agreed_target_ticket}
              </span>
            </dd>
          </div>
        ) : null}
        {rev.contract_signed_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.contractSigned}</dt>
            <dd className="font-mono text-xs">{rev.contract_signed_at.slice(0, 19)}</dd>
          </div>
        ) : null}
        {rev.approved_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.approvedAt}</dt>
            <dd className="font-mono text-xs">{rev.approved_at.slice(0, 19)}</dd>
          </div>
        ) : null}
        {rev.purchasing_completed_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.purchasingStage}</dt>
            <dd className="font-mono text-xs">{rev.purchasing_completed_at.slice(0, 19)}</dd>
          </div>
        ) : null}
        {rev.work_started_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.workStartedStage}</dt>
            <dd className="font-mono text-xs">{rev.work_started_at.slice(0, 19)}</dd>
          </div>
        ) : null}
        {rev.scheduled_work_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.scheduledWork}</dt>
            <dd>{rev.scheduled_work_at}</dd>
          </div>
        ) : null}
        {rev.work_completed_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.workComplete}</dt>
            <dd className="font-mono text-xs">{rev.work_completed_at.slice(0, 19)}</dd>
          </div>
        ) : null}
        {rev.second_control_report_path ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">{tr.revisions.secondReport}</dt>
            <dd className="mt-1">
              <a
                href={`/api/revisions/${rev.id}/second-report`}
                className="text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
              >
                {tr.revisions.downloadSecondReport}
              </a>
            </dd>
          </div>
        ) : null}
        {rev.final_inspection_at ? (
          <div>
            <dt className="text-slate-500">{tr.revisions.finalInspection}</dt>
            <dd className="font-mono text-xs">{rev.final_inspection_at.slice(0, 19)}</dd>
          </div>
        ) : null}
        {rev.final_ticket ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">{tr.revisions.finalTicket}</dt>
            <dd className="mt-1">
              <span className={`inline-flex rounded px-2 py-1 text-sm font-medium ${ticketBadgeClass(rev.final_ticket)}`}>
                {TIER_LABEL[rev.final_ticket] ?? rev.final_ticket}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {canApprove ? (
        <div className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-slate-700">
          <div>
            <label className={label} htmlFor="agreed-ticket">
              {tr.revisions.agreedTargetTicket}
            </label>
            <select
              id="agreed-ticket"
              className={field}
              value={agreedTicket}
              onChange={(e) => setAgreedTicket(e.target.value)}
            >
              {TICKET_ORDER.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => void approve(true)}>
              {tr.revisions.approveOffer}
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
              onClick={() => void approve(false)}
            >
              {tr.revisions.rejectOffer}
            </button>
          </div>
        </div>
      ) : null}

      {approved && !rev.final_inspection_at ? (
        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.revisions.downPaymentSection}</div>
          <p className="text-xs text-slate-500">{tr.revisions.downPaymentHint}</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className={label} htmlFor="dp-amt">
                {tr.revisions.downPaymentAmount}
              </label>
              <input
                id="dp-amt"
                className={field}
                inputMode="decimal"
                value={dpAmount}
                onChange={(e) => setDpAmount(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="dp-on">
                {tr.revisions.downPaymentDate}
              </label>
              <input id="dp-on" type="date" className={field} value={dpDate} onChange={(e) => setDpDate(e.target.value)} />
            </div>
            <button
              type="button"
              disabled={pending || !dpAmount.trim()}
              className={btnPrimary}
              onClick={() => void addDownPayment()}
            >
              {tr.revisions.addDownPayment}
            </button>
          </div>

          {canPurchasingMark ? (
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => void purchasingDone()}>
              {tr.revisions.markPurchasingDone}
            </button>
          ) : null}

          {canWorkStartMark ? (
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => void workStarted()}>
              {tr.revisions.markWorkStarted}
            </button>
          ) : null}

          {canSchedule ? (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className={label}>{tr.revisions.scheduledWork}</label>
                <input
                  type="date"
                  className={field}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <button type="button" disabled={pending || !scheduleDate} className={btnPrimary} onClick={() => void schedule()}>
                {tr.common.save}
              </button>
            </div>
          ) : null}

          {approved && !rev.work_started_at && !rev.final_inspection_at ? (
            <p className="text-xs text-slate-500">{tr.revisions.scheduleAfterWorkStart}</p>
          ) : null}

          {canMarkDone ? (
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => void markDone()}>
              {tr.revisions.markWorkComplete}
            </button>
          ) : null}
        </div>
      ) : null}

      {canUploadSecond ? (
        <form className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700" onSubmit={(e) => void onUploadSecond(e)}>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{tr.revisions.secondReport}</div>
          <input type="hidden" name="revision_id" value={rev.id} />
          <input name="file" type="file" accept="application/pdf,.pdf" className="block w-full text-sm" required />
          <button type="submit" disabled={pending} className={btnPrimary}>
            {tr.revisions.uploadSecondReport}
          </button>
        </form>
      ) : null}

      {canFinal ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{tr.revisions.finalInspectionForm}</div>
          <ul className="space-y-2">
            {rev.lines.map((l) => (
              <li key={l.id}>
                <label className="flex cursor-pointer gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fulfilled.has(l.revision_article_id)}
                    onChange={() => toggleFulfilled(l.revision_article_id)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <span className="font-mono text-xs text-amber-700">{l.article_code}</span> {l.title}
                    <span className="ml-2 text-xs text-slate-500">({TIER_LABEL[l.ticket_tier] ?? l.ticket_tier})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" disabled={pending} className={btnPrimary} onClick={() => void submitFinal()}>
            {tr.revisions.saveInspection}
          </button>
        </div>
      ) : null}
    </div>
  );
}
