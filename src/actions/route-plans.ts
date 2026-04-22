"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { generateMonthlyRoutePlan, insertFieldCrew } from "@/lib/data/route-plans";

export async function generateMonthlyRoutePlanAction(payload: {
  crew_id: string;
  year_month: string;
  visits_per_day: number;
}): Promise<{ ok: true; stopCount: number } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const res = await generateMonthlyRoutePlan(
    tenantId,
    payload.crew_id.trim(),
    payload.year_month.trim(),
    payload.visits_per_day,
  );
  if (!res.ok) return res;
  revalidatePath("/app/schedule");
  return { ok: true, stopCount: res.stopCount };
}

export async function createFieldCrewAction(payload: {
  name: string;
  member_user_ids: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const res = await insertFieldCrew(tenantId, payload.name, payload.member_user_ids ?? []);
  if (!res.ok) return res;
  revalidatePath("/app/schedule");
  return { ok: true, id: res.id };
}
