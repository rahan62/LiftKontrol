"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getElevatorPublicContext } from "@/lib/data/assets";
import { getPool } from "@/lib/db/pool";

function newWorkOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `WO-${y}${m}${day}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

async function insertPublicBreakdown(params: {
  tenantId: string;
  customerId: string;
  siteId: string;
  assetId: string;
  fault: string;
  workType: "repair" | "emergency_breakdown";
  isEmergency: boolean;
}): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const fault = params.fault.trim();
  if (!fault) return { ok: false, error: "Açıklama gerekli." };

  const pool = getPool();
  const number = newWorkOrderNumber();
  const priority = params.isEmergency ? "high" : "normal";

  const { rows } = await pool.query<{ number: string }>(
    `INSERT INTO work_orders (
       tenant_id, number, work_type, priority, status, source,
       customer_id, site_id, elevator_asset_id, fault_symptom, is_emergency, blocking_crew_id
     ) VALUES ($1::uuid, $2, $3, $4, 'open', 'qr_public', $5::uuid, $6::uuid, $7::uuid, $8, $9, NULL)
     RETURNING number`,
    [
      params.tenantId,
      number,
      params.workType,
      priority,
      params.customerId,
      params.siteId,
      params.assetId,
      fault,
      params.isEmergency,
    ],
  );

  const n = rows[0]?.number;
  if (!n) return { ok: false, error: "Kayıt oluşturulamadı." };

  revalidatePath("/app/work-orders");
  revalidatePath(`/app/assets/${params.assetId}`);
  revalidatePath("/app/schedule");

  return { ok: true, number: n };
}

/** Kabinde mahsur — acil iş emri (QR, oturumsuz). */
export async function submitPublicElevatorTrappedAction(
  assetId: string,
  extraNotes: string,
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const row = await getElevatorPublicContext(assetId);
  if (!row) return { ok: false, error: "Asansör kaydı bulunamadı." };

  const notes = extraNotes.trim();
  const base = "Asansör kabininde mahsur kalındı (QR kamu bildirimi).";
  const fault = notes.length ? `${base}\nEk bilgi: ${notes}` : base;

  return insertPublicBreakdown({
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    siteId: row.site_id,
    assetId: assetId.trim().toLowerCase(),
    fault,
    workType: "emergency_breakdown",
    isEmergency: true,
  });
}

/** Mahsur değil — genel arıza bildirimi (QR, oturumsuz). */
export async function submitPublicElevatorFaultAction(
  assetId: string,
  faultSymptom: string,
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const row = await getElevatorPublicContext(assetId);
  if (!row) return { ok: false, error: "Asansör kaydı bulunamadı." };

  const fault = faultSymptom.trim();
  if (fault.length < 3) {
    return { ok: false, error: "Arıza veya talebi birkaç kelimeyle yazın." };
  }

  return insertPublicBreakdown({
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    siteId: row.site_id,
    assetId: assetId.trim().toLowerCase(),
    fault,
    workType: "repair",
    isEmergency: false,
  });
}
