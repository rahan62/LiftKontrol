import { getPool } from "@/lib/db/pool";

export type MarketingPricingContent = {
  eyebrow: string;
  title: string;
  description: string;
  campaignBadge: string;
  packageTitle: string;
  packageSubtitle: string;
  priceMain: string;
  priceUnit: string;
  priceNote: string;
  features: string[];
  footerNote: string;
};

export const DEFAULT_MARKETING_PRICING: MarketingPricingContent = {
  eyebrow: "Şeffaf fiyat",
  title: "Tek paket. Tüm operasyonunuz.",
  description:
    "Gizli ücret yok, kullanıcı başına ek maliyet yok. İlk yılınıza özel kampanya fiyatı ile Lift Kontrol'ü hemen kullanmaya başlayın.",
  campaignBadge: "İlk yıla özel",
  packageTitle: "Lift Kontrol — Kurumsal",
  packageSubtitle: "Yıllık lisans · tüm modüller dahil",
  priceMain: "12.000",
  priceUnit: "TL",
  priceNote: "+ KDV · peşin yıllık faturalama",
  features: [
    "Sınırsız kullanıcı ve rol bazlı yetkilendirme",
    "Müşteri, saha ve asansör varlıkları — tek merkezden",
    "Aylık bakım planlama, arıza ve iş emirleri",
    "Günlük ekip sevkı ve rota planlama",
    "Periyodik kontrol, revizyon ve teklif süreçleri",
    "Stok, depo ve finans takibi",
    "iOS saha uygulaması ve QR ile asansör sayfası",
    "Çok kiracılı, güvenli bulut altyapısı",
  ],
  footerNote:
    "Fiyat, kampanya süresi ve kurumsal ihtiyaçlar için özel koşullar hakkında bilgi almak istiyorsanız",
};

/** `/fiyatlar` ve `/odeme` için geçici 1 TL sandbox test kartı.
 * `NEXT_PUBLIC_*` derlemede gömülür; sunucu-only `PAYMENT_TEST_1TL` da kabul edilir (yeniden başlatma gerekir). */
export function isPaymentTest1TlEnabled(): boolean {
  const candidates = [process.env.NEXT_PUBLIC_PAYMENT_TEST_1TL, process.env.PAYMENT_TEST_1TL];
  for (const raw of candidates) {
    const v = raw?.trim();
    if (v === "1" || v?.toLowerCase() === "true") return true;
  }
  return false;
}

function coercePricing(raw: unknown): Partial<MarketingPricingContent> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const features = o.features;
  const featureList = Array.isArray(features)
    ? features.filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    eyebrow: typeof o.eyebrow === "string" ? o.eyebrow : undefined,
    title: typeof o.title === "string" ? o.title : undefined,
    description: typeof o.description === "string" ? o.description : undefined,
    campaignBadge: typeof o.campaignBadge === "string" ? o.campaignBadge : undefined,
    packageTitle: typeof o.packageTitle === "string" ? o.packageTitle : undefined,
    packageSubtitle: typeof o.packageSubtitle === "string" ? o.packageSubtitle : undefined,
    priceMain: typeof o.priceMain === "string" ? o.priceMain : undefined,
    priceUnit: typeof o.priceUnit === "string" ? o.priceUnit : undefined,
    priceNote: typeof o.priceNote === "string" ? o.priceNote : undefined,
    footerNote: typeof o.footerNote === "string" ? o.footerNote : undefined,
    ...(featureList !== undefined ? { features: featureList } : {}),
  };
}

/** Public /fiyatlar — reads platform_settings.marketing_pricing via DATABASE_URL (bypasses RLS). */
export async function getMarketingPricing(): Promise<MarketingPricingContent> {
  let partial: Partial<MarketingPricingContent> = {};
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ value: unknown }>(
      `select value from public.platform_settings where key = $1`,
      ["marketing_pricing"],
    );
    partial = coercePricing(rows[0]?.value);
  } catch {
    /* no DATABASE_URL or table missing — fall back to defaults */
  }

  const base = DEFAULT_MARKETING_PRICING;
  const merged: MarketingPricingContent = {
    eyebrow: partial.eyebrow ?? base.eyebrow,
    title: partial.title ?? base.title,
    description: partial.description ?? base.description,
    campaignBadge: partial.campaignBadge ?? base.campaignBadge,
    packageTitle: partial.packageTitle ?? base.packageTitle,
    packageSubtitle: partial.packageSubtitle ?? base.packageSubtitle,
    priceMain: partial.priceMain ?? base.priceMain,
    priceUnit: partial.priceUnit ?? base.priceUnit,
    priceNote: partial.priceNote ?? base.priceNote,
    features: partial.features?.length ? partial.features : base.features,
    footerNote: partial.footerNote ?? base.footerNote,
  };

  if (!isPaymentTest1TlEnabled()) return merged;

  return {
    ...merged,
    eyebrow: "Sandbox test",
    title: "Test ödemesi — 1 TL",
    description:
      "iyzico sandbox’ta başarılı ödeme akışını doğrulamak için geçici düşük tutar. Canlıya çıkmadan önce NEXT_PUBLIC_PAYMENT_TEST_1TL ortam değişkenini kaldırın.",
    campaignBadge: "Test — sandbox",
    packageTitle: "Lift Kontrol — Sandbox doğrulama",
    packageSubtitle: "Tek seferlik test ödemesi (1 TRY)",
    priceMain: "1",
    priceUnit: "TL",
    priceNote: "KDV dahil gösterim · tahsilat 1,00 TRY (IYZICO_PRICE_INCLUDES_VAT=1 kullanın)",
    features: [
      "Ödeme akışını /odeme üzerinden tamamlayın",
      "Sandbox test kartları için iyzico dokümantasyonuna bakın",
      "Üretim fiyatına dönmek için bu modu kapatın",
    ],
    footerNote: merged.footerNote,
  };
}
