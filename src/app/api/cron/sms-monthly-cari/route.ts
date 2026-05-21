import {
  cariSmsBucketYm,
  enqueueMonthlyCariSmsForAllTenants,
} from "@/lib/sms/enqueue-monthly-cari";
import { NextResponse } from "next/server";

/** Aylık net cari özeti SMS kuyruğu (kiracı başına müşteri iletişim telefonu). İsteğe bağlı `?ym=YYYY-MM`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET tanımlı değil" }, { status: 501 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("secret")?.trim();
  const auth = req.headers.get("authorization")?.trim();
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (q !== secret && bearer !== secret) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  const ymParam = url.searchParams.get("ym")?.trim();
  const ym = ymParam && /^\d{4}-\d{2}$/.test(ymParam) ? ymParam : undefined;

  try {
    const res = await enqueueMonthlyCariSmsForAllTenants(ym);
    return NextResponse.json({
      ok: true,
      bucketYm: ym ?? cariSmsBucketYm(),
      ...res,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Cari SMS enqueue hatası" },
      { status: 500 },
    );
  }
}
