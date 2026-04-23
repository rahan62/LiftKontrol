import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateMarketingPricingAction } from "@/server/marketing-actions";

type PricingJson = {
  eyebrow?: string;
  title?: string;
  description?: string;
  campaignBadge?: string;
  packageTitle?: string;
  packageSubtitle?: string;
  priceMain?: string;
  priceUnit?: string;
  priceNote?: string;
  footerNote?: string;
  features?: string[];
};

export default async function MarketingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "marketing_pricing")
    .maybeSingle();

  const v = (row?.value ?? {}) as PricingJson;
  const featuresText = Array.isArray(v.features) ? v.features.join("\n") : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/tenants" className="text-sm text-amber-400 hover:text-amber-300">
          ← Firmalar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Site fiyatlandırması</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ana web sitesindeki /fiyatlar sayfası bu içeriği veritabanından okur (DATABASE_URL).
        </p>
      </div>

      {sp.error ? (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {decodeURIComponent(sp.error)}
        </p>
      ) : null}
      {sp.ok ? (
        <p className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          Kaydedildi.
        </p>
      ) : null}

      <form action={updateMarketingPricingAction} className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <div>
          <label className="text-xs text-slate-400">Üst etiket (eyebrow)</label>
          <input name="eyebrow" defaultValue={v.eyebrow ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Başlık</label>
          <input name="title" defaultValue={v.title ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Açıklama</label>
          <textarea name="description" rows={3} defaultValue={v.description ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Kampanya rozeti</label>
          <input name="campaignBadge" defaultValue={v.campaignBadge ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Paket başlığı</label>
          <input name="packageTitle" defaultValue={v.packageTitle ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Paket alt başlığı</label>
          <input name="packageSubtitle" defaultValue={v.packageSubtitle ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400">Fiyat (ana)</label>
            <input name="priceMain" defaultValue={v.priceMain ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Birim</label>
            <input name="priceUnit" defaultValue={v.priceUnit ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Fiyat notu</label>
            <input name="priceNote" defaultValue={v.priceNote ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400">Özellikler (her satır bir madde)</label>
          <textarea name="features" rows={10} defaultValue={featuresText} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Alt not (footer)</label>
          <textarea name="footerNote" rows={2} defaultValue={v.footerNote ?? ""} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <button type="submit" className="rounded-md bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400">
          Kaydet
        </button>
      </form>
    </div>
  );
}
