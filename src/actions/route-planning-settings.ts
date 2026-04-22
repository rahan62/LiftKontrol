"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { recomputeTenantRouteClusters } from "@/lib/data/route-plans";
import { upsertRoutePlanningSettings } from "@/lib/data/tenant-route-settings";

export async function updateRoutePlanningSettingsAction(payload: {
  cluster_radius_km: number;
  max_units_per_cluster: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const res = await upsertRoutePlanningSettings(tenantId, {
    cluster_radius_km: payload.cluster_radius_km,
    max_units_per_cluster: payload.max_units_per_cluster,
  });
  if (!res.ok) return res;
  try {
    await recomputeTenantRouteClusters(tenantId);
  } catch {
    /* küme yeniden hesaplanamazsa ayar yine kayıtlı */
  }
  revalidatePath("/app/settings");
  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/clusters");
  return { ok: true };
}
