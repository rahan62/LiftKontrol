"use client";

import { createFieldCrewAction, generateMonthlyRoutePlanAction } from "@/actions/route-plans";
import { appleMapsDirectionsUrl } from "@/lib/maps/apple-maps";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import type { FieldCrewRow } from "@/lib/data/field-crews";
import type { DailyDispatchStopDetail } from "@/lib/data/daily-dispatch";
import type { BlockingBreakdownRow, DailyStopDetail } from "@/lib/data/route-plans";
import type { TenantMemberProfileRow } from "@/lib/data/tenant-members";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type Props = {
  crews: FieldCrewRow[];
  memberProfiles: TenantMemberProfileRow[];
  yearMonth: string;
  selectedCrewId: string;
  initialStops: DailyStopDetail[];
  blockers: BlockingBreakdownRow[];
  hasPlan: boolean;
  view: "monthly" | "daily";
  dailyStops: DailyDispatchStopDetail[];
  dailyDateLabel: string;
};

function stopsByDate(stops: DailyStopDetail[]): Map<string, DailyStopDetail[]> {
  const m = new Map<string, DailyStopDetail[]>();
  for (const s of stops) {
    const k = s.service_date;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(s);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.sequence - b.sequence);
  }
  return new Map([...m.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function SchedulePlannerClient({
  crews,
  memberProfiles,
  yearMonth,
  selectedCrewId,
  initialStops,
  blockers,
  hasPlan,
  view,
  dailyStops,
  dailyDateLabel,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [crewId, setCrewId] = useState(selectedCrewId);
  const [ym, setYm] = useState(yearMonth);
  const [visits, setVisits] = useState(10);
  const [showNewCrew, setShowNewCrew] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [memberPick, setMemberPick] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => stopsByDate(initialStops), [initialStops]);

  function syncQuery(nextCrew: string, nextYm: string, nextView: "monthly" | "daily" = view) {
    const sp = new URLSearchParams();
    if (nextCrew) sp.set("crew", nextCrew);
    if (nextYm) sp.set("ym", nextYm);
    if (nextView === "daily") sp.set("view", "daily");
    else sp.delete("view");
    router.push(`/app/schedule?${sp.toString()}`);
    router.refresh();
  }

  async function onGenerate() {
    setError(null);
    if (!crewId) {
      setError(tr.schedule.noCrews);
      return;
    }
    startTransition(async () => {
      const res = await generateMonthlyRoutePlanAction({
        crew_id: crewId,
        year_month: ym,
        visits_per_day: visits,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function onCreateCrew() {
    setError(null);
    const name = newCrewName.trim();
    if (!name) {
      setError("Ekip adı gerekli");
      return;
    }
    const userIds = Object.entries(memberPick)
      .filter(([, v]) => v)
      .map(([k]) => k);
    startTransition(async () => {
      const res = await createFieldCrewAction({ name, member_user_ids: userIds });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowNewCrew(false);
      setNewCrewName("");
      setMemberPick({});
      setCrewId(res.id);
      syncQuery(res.id, ym, view);
    });
  }

  if (!crews.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">{tr.schedule.noCrews}</p>
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-900 dark:text-white">{tr.schedule.newCrew}</div>
          <div className="mt-2">
            <label className={label}>{tr.schedule.crewName}</label>
            <input className={field} value={newCrewName} onChange={(e) => setNewCrewName(e.target.value)} />
          </div>
          <div className="mt-3 max-h-48 overflow-y-auto rounded border border-slate-200 p-2 text-sm dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500">{tr.schedule.members}</div>
            {memberProfiles.map((m) => (
              <label key={m.user_id} className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={memberPick[m.user_id] ?? false}
                  onChange={(e) =>
                    setMemberPick((p) => ({
                      ...p,
                      [m.user_id]: e.target.checked,
                    }))
                  }
                />
                <span>{m.full_name || m.email || m.user_id.slice(0, 8)}</span>
              </label>
            ))}
          </div>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          <button type="button" className={`${btnPrimary} mt-3`} disabled={pending} onClick={() => void onCreateCrew()}>
            {pending ? tr.common.loading : tr.common.save}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/app/schedule/clusters"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
          title={tr.schedule.clustersPageTitle}
          aria-label={tr.schedule.clustersPageTitle}
        >
          <span className="text-lg" aria-hidden>
            ◎
          </span>
        </Link>
        <div className="inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-600">
          <button
            type="button"
            className={
              view === "monthly"
                ? "rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
                : "rounded px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"
            }
            onClick={() => syncQuery(crewId, ym, "monthly")}
          >
            {tr.schedule.viewMonthly}
          </button>
          <button
            type="button"
            className={
              view === "daily"
                ? "rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
                : "rounded px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"
            }
            onClick={() => syncQuery(crewId, ym, "daily")}
          >
            {tr.schedule.viewDaily}
          </button>
        </div>
      </div>

      {view === "daily" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">{tr.schedule.dailyDescription}</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={label}>{tr.schedule.crew}</label>
              <select
                className={field}
                value={crewId}
                onChange={(e) => {
                  const v = e.target.value;
                  setCrewId(v);
                  syncQuery(v, ym, "daily");
                }}
              >
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">
            {dailyDateLabel} · {tr.schedule.dailyTitle}
          </p>
          {!crewId ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{tr.schedule.noCrews}</p>
          ) : dailyStops.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">{tr.schedule.dailyEmpty}</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {dailyStops.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline gap-3 px-3 py-2 text-sm">
                  <span className="w-8 text-xs text-slate-500">
                    {tr.schedule.sequence} {s.sequence + 1}
                  </span>
                  <Link
                    href={`/app/assets/${s.elevator_asset_id}`}
                    className="font-medium text-amber-800 hover:underline dark:text-amber-400"
                  >
                    {s.unit_code}
                  </Link>
                  <span className="text-slate-600 dark:text-slate-400">{s.site_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {view === "monthly" ? (
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={label}>{tr.schedule.crew}</label>
          <select
            className={field}
            value={crewId}
            onChange={(e) => {
              const v = e.target.value;
              setCrewId(v);
              syncQuery(v, ym, view);
            }}
          >
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{tr.schedule.yearMonth}</label>
          <input
            type="month"
            className={field}
            value={ym}
            onChange={(e) => {
              const v = e.target.value;
              setYm(v);
              syncQuery(crewId, v, view);
            }}
          />
        </div>
        <div>
          <label className={label}>{tr.schedule.visitsPerDay}</label>
          <input
            type="number"
            min={1}
            max={50}
            className={field}
            value={visits}
            onChange={(e) => setVisits(Number.parseInt(e.target.value, 10) || 10)}
          />
        </div>
        <button type="button" className={btnPrimary} disabled={pending || !crewId} onClick={() => void onGenerate()}>
          {pending ? tr.common.loading : tr.schedule.generatePlan}
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
          onClick={() => setShowNewCrew((s) => !s)}
        >
          {tr.schedule.newCrew}
        </button>
      </div>
      ) : null}

      {view === "monthly" && showNewCrew ? (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="text-sm font-medium">{tr.schedule.newCrew}</div>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              className={field}
              placeholder={tr.schedule.crewName}
              value={newCrewName}
              onChange={(e) => setNewCrewName(e.target.value)}
            />
            <button type="button" className={btnPrimary} disabled={pending} onClick={() => void onCreateCrew()}>
              {tr.common.add}
            </button>
          </div>
          <div className="mt-2 max-h-36 overflow-y-auto text-sm">
            {memberProfiles.map((m) => (
              <label key={m.user_id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={memberPick[m.user_id] ?? false}
                  onChange={(e) =>
                    setMemberPick((p) => ({
                      ...p,
                      [m.user_id]: e.target.checked,
                    }))
                  }
                />
                {m.full_name || m.email || m.user_id}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {blockers.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">{tr.schedule.blockingBanner}</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {blockers.map((b) => (
              <li key={b.id}>
                <Link href={`/app/work-orders/${b.id}`} className="underline">
                  {b.number}
                </Link>
                {b.fault_symptom ? ` — ${b.fault_symptom}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {view === "monthly" ? (
        <>
          <p className="text-xs text-slate-500">{tr.schedule.mapsHint}</p>
          <p className="text-xs text-slate-500">{tr.schedule.shiftNote}</p>

          {!hasPlan || initialStops.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">{tr.schedule.noPlan}</p>
          ) : (
            <div className="space-y-6">
              {[...grouped.entries()].map(([date, dayStops]) => {
            const coords = dayStops
              .map((s) =>
                s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null,
              )
              .filter((c): c is { lat: number; lng: number } => c !== null);
            const mapsUrl = appleMapsDirectionsUrl(coords);
            return (
              <div
                key={date}
                className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{date}</div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
                  >
                    {tr.schedule.openAppleMaps}
                  </a>
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {dayStops.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-baseline gap-3 px-3 py-2 text-sm">
                      <span className="w-8 text-xs text-slate-500">
                        {tr.schedule.sequence} {s.sequence + 1}
                      </span>
                      <Link
                        href={`/app/assets/${s.elevator_asset_id}`}
                        className="font-medium text-amber-800 hover:underline dark:text-amber-400"
                      >
                        {s.unit_code}
                      </Link>
                      <span className="text-slate-600 dark:text-slate-400">{s.site_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
