import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { getPool } from "@/lib/db/pool";
import { guessContentType, writeStoredBlob } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

type MultipartFields = { get(name: string): FormDataEntryValue | null };

/** Native: sözleşme oluşturma (web `createContractAction` ile aynı mantık). */
export async function POST(request: Request) {
  const auth = await getMobileTenantContext(request);
  if (!auth.ok) return auth.response;

  const tenantId = auth.ctx.tenantId;
  let form: MultipartFields;
  try {
    form = (await request.formData()) as unknown as MultipartFields;
  } catch {
    return NextResponse.json({ ok: false, error: "multipart/form-data gerekli." }, { status: 400 });
  }

  const customer_id = String(form.get("customer_id") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const counterparty_name = String(form.get("counterparty_name") ?? "").trim();
  const start_at = String(form.get("start_at") ?? "").trim();
  const end_at = String(form.get("end_at") ?? "").trim();
  const transfer = String(form.get("maintenance_transfer_basis") ?? "").trim();
  const maintenance_transfer_basis =
    transfer === "direct_after_prior_expiry" || transfer === "after_annual_en8120" ? transfer : null;
  const file = form.get("file");

  if (!customer_id || !title || !start_at) {
    return NextResponse.json({ ok: false, error: "Müşteri, başlık ve başlangıç tarihi gerekli." }, { status: 400 });
  }

  const pool = getPool();
  const { rows: ck } = await pool.query<{ ok: boolean }>(
    `SELECT true AS ok FROM customers WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, customer_id],
  );
  if (!ck[0]?.ok) {
    return NextResponse.json({ ok: false, error: "Geçersiz müşteri." }, { status: 400 });
  }

  let storedPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    storedPath = await writeStoredBlob({
      tenantId,
      category: "contracts",
      originalFilename: file.name || `${randomUUID()}.bin`,
      bytes: buf,
      contentType: guessContentType(file.name || ""),
    });
  }

  const { rows: ins } = await pool.query<{ id: string }>(
    `INSERT INTO contracts (
       tenant_id, customer_id, contract_type, status, title, start_at, end_at, counterparty_name, stored_file_path,
       maintenance_transfer_basis
     ) VALUES ($1::uuid, $2::uuid, 'maintenance', 'active', $3, $4::date, $5::date, $6, $7, $8)
     RETURNING id::text AS id`,
    [
      tenantId,
      customer_id,
      title,
      start_at,
      end_at || null,
      counterparty_name || null,
      storedPath,
      maintenance_transfer_basis,
    ],
  );

  const id = ins[0]?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Kayıt oluşturulamadı." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
