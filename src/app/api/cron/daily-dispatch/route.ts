import { istanbulDateString, istanbulHour, runMorningDispatchesForAllTenants } from "@/lib/data/daily-dispatch";
import { NextResponse } from "next/server";

/**
 * Her gün İstanbul saati 06:00 civarında tetiklenir (Vercel: `0 3 * * *` UTC ≈ TR sabahı).
 * `Authorization: Bearer $CRON_SECRET` veya `?secret=` ile korunur.
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
  const force = url.searchParams.get("force") === "1";
  const hour = istanbulHour();
  if (!force && hour !== 6) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      istanbulHour: hour,
      message: "Yalnızca İstanbul saati 06:00'da toplu sevk çalıştırılır. Test için &force=1 ekleyin.",
    });
  }
  const today = istanbulDateString();
  try {
    const res = await runMorningDispatchesForAllTenants(today);
    return NextResponse.json({ ok: true, date: today, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Cron hata" },
      { status: 500 },
    );
  }
}
