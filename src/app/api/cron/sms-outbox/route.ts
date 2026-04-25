import { processSmsOutboxQueue } from "@/lib/data/sms-outbox";
import { NextResponse } from "next/server";

/**
 * SMS kuyruğunu sırayla işler (Netgsm REST).
 * Vercel Hobby: günde en fazla 1 tetik — `vercel.json` içinde 14:00 UTC (≈ İstanbul 17:00).
 * Pro’da sıklığı artırabilirsiniz. Güvenlik: `Authorization: Bearer $CRON_SECRET` veya `?secret=`.
 */
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

  try {
    const res = await processSmsOutboxQueue();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "SMS kuyruk hatası" },
      { status: 500 },
    );
  }
}
