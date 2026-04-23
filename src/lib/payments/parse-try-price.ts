/**
 * Marketing fiyat metni (örn. "12.000" veya "12000,50") → sayı (TRY).
 * Türkiye'de binlik ayırıcı nokta varsayılır.
 */
export function parseTryDisplayPriceToNumber(priceMain: string): number {
  const s = priceMain.trim();
  if (!s) return 0;

  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseInt(s.replace(/\./g, ""), 10);
  }
  if (/^\d+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(",", "."));
  }

  const compact = s.replace(/\s/g, "");
  if (/^\d+$/.test(compact)) {
    return parseInt(compact, 10);
  }

  const n = parseFloat(compact.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Sepet / paidPrice için iyzico string formatı (örn. "14400.00"). */
export function formatIyzicoMoney(amount: number): string {
  return amount.toFixed(2);
}
