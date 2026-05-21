import { scanRecentMaintenanceForSmsEnqueue } from "@/lib/sms/enqueue-maintenance";
import { NextResponse } from "next/server";

/** Bakım tamamlama SMS kuyruğu (son ~21 gün); web + iOS kayıtlarını tarar. `CRON_SECRET` gerekir. */
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
    const res = await scanRecentMaintenanceForSmsEnqueue();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Bakım SMS enqueue hatası" },
      { status: 500 },
    );
  }
}
