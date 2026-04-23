/**
 * Mesafeli satış ve teslimat metinlerinde kullanılır.
 * Üretim öncesi ticari ünvan, adres, MERSİS ve telefonu güncelleyin (iyzico / 6502 uyumu).
 */
export const SELLER_LEGAL = {
  tradeName: "Lift Kontrol",
  email: "support@liftkontrol.com",
  /** Örnek; gerçek adresinizi yazın. */
  address: "[Ticari adres — güncellenmeli]",
  /** https://mersis.gov.tr */
  mersisNo: "[MERSİS numarası — güncellenmeli]",
  phone: "[İletişim telefonu — güncellenmeli]",
} as const;
