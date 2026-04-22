import { assertSiteBelongsToCustomer } from "@/lib/data/projects-data";
import { getMobileTenantContext } from "@/lib/mobile/bearer-tenant";
import { getPool } from "@/lib/db/pool";
import { guessContentType, writeStoredBlob } from "@/lib/storage/blob-store";
import { NextResponse } from "next/server";

type MultipartFields = { get(name: string): FormDataEntryValue | null };

/** Native: belge yükleme (web `createTenantDocumentAction` ile aynı). */
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

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const customer_id = String(form.get("customer_id") ?? "").trim() || null;
  const site_id = String(form.get("site_id") ?? "").trim() || null;
  const project_id = String(form.get("project_id") ?? "").trim() || null;
  const file = form.get("file");

  if (!title || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Başlık ve dosya gerekli." }, { status: 400 });
  }

  if (site_id && customer_id) {
    const ok = await assertSiteBelongsToCustomer(tenantId, site_id, customer_id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Saha seçimi müşteri ile uyumsuz." }, { status: 400 });
    }
  } else if (site_id && !customer_id) {
    return NextResponse.json({ ok: false, error: "Saha için müşteri seçin." }, { status: 400 });
  }

  const pool = getPool();
  if (project_id) {
    const { rows } = await pool.query<{ ok: boolean }>(
      `SELECT true AS ok FROM projects WHERE tenant_id = $1::uuid AND id = $2::uuid`,
      [tenantId, project_id],
    );
    if (!rows[0]?.ok) {
      return NextResponse.json({ ok: false, error: "Geçersiz proje." }, { status: 400 });
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await writeStoredBlob({
    tenantId,
    category: "documents",
    originalFilename: file.name || "document",
    bytes: buf,
    contentType: guessContentType(file.name || ""),
  });

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO tenant_documents (
       tenant_id, title, description, stored_path, original_filename, mime_type,
       customer_id, site_id, project_id
     ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8::uuid, $9::uuid)
     RETURNING id::text AS id`,
    [
      tenantId,
      title,
      description,
      stored,
      file.name || null,
      guessContentType(file.name || ""),
      customer_id,
      site_id,
      project_id,
    ],
  );

  const id = rows[0]?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Kayıt oluşturulamadı." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
