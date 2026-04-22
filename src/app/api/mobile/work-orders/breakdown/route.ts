import { crewBelongsToTenant } from "@/lib/data/route-plans";
import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { getPool } from "@/lib/db/pool";
import { istanbulDateString, replaceDailyDispatchForCrew } from "@/lib/data/daily-dispatch";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

function newWorkOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `WO-${y}${m}${day}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

type Body = {
  elevator_asset_id?: string;
  fault_symptom?: string;
  work_type?: "repair" | "emergency_breakdown";
  is_emergency?: boolean;
  blocking_crew_id?: string | null;
};

/** Native: arıza / onarım iş emri açma (`createBreakdownWorkOrderAction` ile aynı mantık). */
export async function POST(request: Request) {
  const auth = await getMobileTenantContext(request);
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON." }, { status: 400 });
  }

  const tenantId = auth.ctx.tenantId;
  const assetId = String(body.elevator_asset_id ?? "").trim();
  const fault = String(body.fault_symptom ?? "").trim();
  const workType = body.work_type === "emergency_breakdown" ? "emergency_breakdown" : "repair";
  const isEmergency = Boolean(body.is_emergency) || workType === "emergency_breakdown";

  if (!fault) {
    return NextResponse.json({ ok: false, error: "Arıza / talep açıklaması gerekli" }, { status: 400 });
  }
  if (!assetId) {
    return NextResponse.json({ ok: false, error: "Asansör gerekli" }, { status: 400 });
  }

  const pool = getPool();
  const { rows: arows } = await pool.query<{ customer_id: string | null; site_id: string | null }>(
    `SELECT customer_id::text AS customer_id, site_id::text AS site_id
     FROM elevator_assets WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, assetId],
  );
  const a = arows[0];
  if (!a) {
    return NextResponse.json({ ok: false, error: "Asansör bulunamadı" }, { status: 404 });
  }
  const customerId = a.customer_id ? String(a.customer_id) : "";
  const siteId = a.site_id ? String(a.site_id) : "";
  if (!customerId || !siteId) {
    return NextResponse.json({ ok: false, error: "Müşteri veya saha bilgisi eksik" }, { status: 400 });
  }

  let blockingCrewId: string | null = null;
  const rawCrew = body.blocking_crew_id?.trim();
  if (rawCrew) {
    if (!(await crewBelongsToTenant(tenantId, rawCrew))) {
      return NextResponse.json({ ok: false, error: "Geçersiz saha ekibi" }, { status: 400 });
    }
    blockingCrewId = rawCrew;
  }

  const number = newWorkOrderNumber();
  const priority = isEmergency ? "high" : "normal";

  const { rows: ins } = await pool.query<{ id: string }>(
    `INSERT INTO work_orders (
       tenant_id, number, work_type, priority, status, source,
       customer_id, site_id, elevator_asset_id, fault_symptom, is_emergency, blocking_crew_id
     ) VALUES ($1::uuid, $2, $3, $4, 'open', 'internal', $5::uuid, $6::uuid, $7::uuid, $8, $9, $10::uuid)
     RETURNING id::text AS id`,
    [
      tenantId,
      number,
      workType,
      priority,
      customerId,
      siteId,
      assetId,
      fault,
      isEmergency,
      blockingCrewId,
    ],
  );

  const id = ins[0]?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Kayıt oluşturulamadı" }, { status: 500 });
  }

  if (blockingCrewId) {
    try {
      await replaceDailyDispatchForCrew({
        tenantId,
        crewId: blockingCrewId,
        dispatchDate: istanbulDateString(),
        maxStops: 10,
      });
    } catch {
      /* günlük sevk yenilenemedi; iş emri yine de oluştu */
    }
  }

  return NextResponse.json({ ok: true, id, number });
}
