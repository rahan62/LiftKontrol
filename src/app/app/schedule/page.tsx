import { SchedulePlannerClient } from "@/components/schedule/schedule-planner-client";
import { DataTableShell } from "@/components/module/data-table-shell";
import { istanbulDateString, listDailyDispatchStopsDetail } from "@/lib/data/daily-dispatch";
import { listFieldCrews } from "@/lib/data/field-crews";
import {
  getMonthlyPlanId,
  listDailyStopsForPlan,
  listOpenBlockingBreakdownsForCrew,
} from "@/lib/data/route-plans";
import { listTenantMemberProfiles } from "@/lib/data/tenant-members";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string; ym?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const crews = await listFieldCrews(ctx.tenantId);
  const memberProfiles = await listTenantMemberProfiles(ctx.tenantId);
  const now = new Date();
  const ym =
    sp.ym?.trim() ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const crewId = sp.crew?.trim() || crews[0]?.id || "";

  const view = sp.view === "daily" ? "daily" : "monthly";
  const todayTr = istanbulDateString();

  let planId: string | null = null;
  let stops: Awaited<ReturnType<typeof listDailyStopsForPlan>> = [];
  let blockers: Awaited<ReturnType<typeof listOpenBlockingBreakdownsForCrew>> = [];
  let dailyStops: Awaited<ReturnType<typeof listDailyDispatchStopsDetail>> = [];
  if (crewId) {
    planId = await getMonthlyPlanId(ctx.tenantId, crewId, ym);
    if (planId) stops = await listDailyStopsForPlan(ctx.tenantId, planId);
    blockers = await listOpenBlockingBreakdownsForCrew(ctx.tenantId, crewId);
    dailyStops = await listDailyDispatchStopsDetail(ctx.tenantId, crewId, todayTr);
  }

  return (
    <DataTableShell title={tr.schedule.title} description={tr.schedule.description}>
      <SchedulePlannerClient
        crews={crews}
        memberProfiles={memberProfiles}
        yearMonth={ym}
        selectedCrewId={crewId}
        initialStops={stops}
        blockers={blockers}
        hasPlan={Boolean(planId)}
        view={view}
        dailyStops={dailyStops}
        dailyDateLabel={todayTr}
      />
    </DataTableShell>
  );
}
