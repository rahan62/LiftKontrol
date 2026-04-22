import { recordPartsUsageBatch, type WorkType } from "@/lib/data/parts-usage";
import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { NextResponse } from "next/server";

type Line = { stock_item_id: string; qty: number; unit_price: number };

type Body = {
  elevator_asset_id?: string;
  site_id?: string;
  work_type?: WorkType;
  unit_code?: string;
  monthly_maintenance_id?: string | null;
  work_order_id?: string | null;
  lines?: Line[];
};

/** Native: parça kullanımı toplu kayıt (`recordPartsUsageAction` ile aynı çekirdek). */
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
  const elevatorAssetId = String(body.elevator_asset_id ?? "").trim();
  const siteId = String(body.site_id ?? "").trim();
  const unitCode = String(body.unit_code ?? "").trim();
  const workType = (body.work_type ?? "repair") as WorkType;
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!elevatorAssetId || !siteId || !unitCode) {
    return NextResponse.json({ ok: false, error: "Asansör, saha ve ünite kodu gerekli." }, { status: 400 });
  }

  const parsed: { stock_item_id: string; qty: number; unit_price: number }[] = [];
  for (const ln of lines) {
    const sid = String(ln.stock_item_id ?? "").trim();
    const qty = Number(ln.qty);
    const unitPrice = Number(ln.unit_price);
    if (!sid || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice)) {
      return NextResponse.json({ ok: false, error: "Her satırda geçerli parça, miktar ve birim fiyat gerekli." }, { status: 400 });
    }
    parsed.push({ stock_item_id: sid, qty, unit_price: unitPrice });
  }

  const result = await recordPartsUsageBatch(tenantId, {
    elevator_asset_id: elevatorAssetId,
    site_id: siteId,
    work_type: workType,
    lines: parsed,
    monthly_maintenance_id: body.monthly_maintenance_id?.trim() || null,
    work_order_id: body.work_order_id?.trim() || null,
    unit_code: unitCode,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, batchId: result.batchId, financeId: result.financeId });
}
