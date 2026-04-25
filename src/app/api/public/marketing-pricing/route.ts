import { getMarketingPricing } from "@/lib/data/marketing-pricing";
import { NextResponse } from "next/server";

/** Mobil / harici istemciler: web `/fiyatlar` ile aynı içerik (platform_settings). */
export async function GET() {
  const content = await getMarketingPricing();
  return NextResponse.json(content, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
