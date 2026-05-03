import type { MarketingPricingContent } from "@/lib/data/marketing-pricing";

/** Sabit 1 TL demo satırı — `/odeme/demo`, iyzico sepetinde `liftkontrol-demo`. */
export const DEMO_PRODUCT_PRICING: MarketingPricingContent = {
  eyebrow: "Demo",
  title: "Demo ürünü",
  description: "Ödeme ve callback akışını denemek için düşük tutarlı örnek ürün.",
  campaignBadge: "Demo",
  packageTitle: "Demo Ürünü",
  packageSubtitle: "Tek seferlik dijital ürün · test amaçlı",
  priceMain: "1",
  priceUnit: "TL",
  priceNote:
    "Tahsil tutarı ortam ayarına göre hesaplanır (IYZICO_PRICE_INCLUDES_VAT). Tam 1,00 TRY için KDV dahil modunu kullanın.",
  features: ["Ödeme formu ve iyzico dönüşünü doğrulamak için uygundur."],
  footerNote: "Bu satır yalnızca demo / test içindir.",
};
