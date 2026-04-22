"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { getAssetWithSiteCustomer, getElevatorUnitCode } from "@/lib/data/assets";
import { getWorkOrder } from "@/lib/data/work-orders";
import { maybeCreateWorkOrderLaborFinance } from "@/lib/data/work-order-billing";
import { workTypeAllowsAutoLabor } from "@/lib/domain/work-order-billing";
import { crewBelongsToTenant, shiftRoutePlansAfterBreakdownResolved } from "@/lib/data/route-plans";
import { insertWorkOrder, updateWorkOrderBlockingCrew, updateWorkOrderStatus } from "@/lib/data/writes";

function newWorkOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `WO-${y}${m}${day}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function createBreakdownWorkOrderAction(payload: {
  elevator_asset_id: string;
  fault_symptom: string;
  work_type: "repair" | "emergency_breakdown";
  is_emergency: boolean;
  /** Bu ekibe bağlı aylık program varsa, arıza süresince duraklatılır; kapanınca kaydırılır. */
  blocking_crew_id?: string | null;
}): Promise<{ ok: true; id: string; number: string } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const fault = payload.fault_symptom.trim();
  if (!fault) {
    return { ok: false, error: "Arıza / talep açıklaması gerekli" };
  }

  const row = await getAssetWithSiteCustomer(tenantId, payload.elevator_asset_id);
  if (!row) {
    return { ok: false, error: "Asansör bulunamadı" };
  }
  const a = row.asset;
  const customerId = String(a.customer_id ?? "");
  const siteId = String(a.site_id ?? "");
  if (!customerId || !siteId) {
    return { ok: false, error: "Müşteri veya saha bilgisi eksik" };
  }

  let blockingCrewId: string | null = null;
  if (payload.blocking_crew_id?.trim()) {
    const cid = payload.blocking_crew_id.trim();
    if (!(await crewBelongsToTenant(tenantId, cid))) {
      return { ok: false, error: "Geçersiz saha ekibi" };
    }
    blockingCrewId = cid;
  }

  const number = newWorkOrderNumber();
  const res = await insertWorkOrder(tenantId, {
    number,
    work_type: payload.work_type,
    priority: payload.is_emergency ? "high" : "normal",
    status: "open",
    customer_id: customerId,
    site_id: siteId,
    elevator_asset_id: payload.elevator_asset_id,
    fault_symptom: fault,
    is_emergency: payload.is_emergency,
    blocking_crew_id: blockingCrewId,
  });
  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  revalidatePath("/app/work-orders");
  revalidatePath(`/app/assets/${payload.elevator_asset_id}`);
  revalidatePath("/app/schedule");
  return { ok: true, id: res.id, number };
}

export async function updateWorkOrderBlockingCrewAction(
  work_order_id: string,
  blocking_crew_id: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  if (blocking_crew_id?.trim()) {
    if (!(await crewBelongsToTenant(tenantId, blocking_crew_id.trim()))) {
      return { ok: false, error: "Geçersiz saha ekibi" };
    }
  }
  const res = await updateWorkOrderBlockingCrew(
    tenantId,
    work_order_id,
    blocking_crew_id?.trim() || null,
  );
  if (!res.ok) return res;
  revalidatePath("/app/work-orders");
  revalidatePath(`/app/work-orders/${work_order_id}`);
  revalidatePath("/app/schedule");
  return { ok: true };
}

export async function completeWorkOrderWithBillingAction(payload: {
  work_order_id: string;
  labor_amount: string;
  labor_note: string;
  occurred_on: string;
}): Promise<
  | { ok: true; financeEntryId?: string }
  | { ok: false; error: string }
> {
  const tenantId = await requireTenantId();
  const wo = await getWorkOrder(tenantId, payload.work_order_id);
  if (!wo) {
    return { ok: false, error: "İş emri bulunamadı" };
  }

  const status = String(wo.status ?? "");
  if (status === "completed") {
    return { ok: false, error: "Bu iş emri zaten tamamlandı" };
  }
  if (status === "cancelled") {
    return { ok: false, error: "İptal edilmiş iş emri kapatılamaz" };
  }

  const workType = String(wo.work_type ?? "");
  const assetId = wo.elevator_asset_id ? String(wo.elevator_asset_id) : null;
  if (!assetId) {
    return { ok: false, error: "İş emrinde asansör bağlı değil; faturalandırma yapılamaz" };
  }

  const laborRaw = payload.labor_amount.trim().replace(",", ".");
  const laborAmount = laborRaw === "" ? 0 : Number.parseFloat(laborRaw);
  if (laborRaw !== "" && !Number.isFinite(laborAmount)) {
    return { ok: false, error: "Geçerli işçilik tutarı girin" };
  }
  if (laborAmount < 0) {
    return { ok: false, error: "İşçilik tutarı negatif olamaz" };
  }
  if (laborAmount > 0 && !workTypeAllowsAutoLabor(workType)) {
    return {
      ok: false,
      error: "Otomatik işçilik kaydı yalnızca onarım veya acil arıza iş emirleri için kullanılabilir",
    };
  }

  let occurredOn = payload.occurred_on.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    occurredOn = new Date().toISOString().slice(0, 10);
  }

  const blockingCrewId = wo.blocking_crew_id ? String(wo.blocking_crew_id) : null;
  const openedAtIso = String(wo.created_at ?? new Date().toISOString());

  const closedIso = new Date().toISOString();
  const upd = await updateWorkOrderStatus(tenantId, payload.work_order_id, {
    status: "completed",
    actual_end: closedIso,
  });
  if (!upd.ok) {
    return { ok: false, error: upd.error };
  }

  if (
    blockingCrewId &&
    (workType === "repair" || workType === "emergency_breakdown")
  ) {
    await shiftRoutePlansAfterBreakdownResolved(tenantId, blockingCrewId, openedAtIso, closedIso);
  }

  const unitCode = (await getElevatorUnitCode(tenantId, assetId)) ?? "Ünite";
  const woNumber = String(wo.number ?? payload.work_order_id);

  const laborFin = await maybeCreateWorkOrderLaborFinance(tenantId, {
    workOrderId: payload.work_order_id,
    elevatorAssetId: assetId,
    unitCode,
    workOrderNumber: woNumber,
    laborAmount,
    laborNote: payload.labor_note.trim() || null,
    occurredOn,
  });

  revalidatePath("/app/work-orders");
  revalidatePath(`/app/work-orders/${payload.work_order_id}`);
  revalidatePath("/app/finances");
  revalidatePath(`/app/assets/${assetId}`);
  revalidatePath("/app/schedule");

  return { ok: true, financeEntryId: laborFin.financeEntryId };
}
