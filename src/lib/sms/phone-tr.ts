/** Netgsm REST örnekleri: alıcı `no` alanı 10 hane, 5 ile başlar (ülke kodu olmadan). */

export function normalizeTrGsmForNetgsm(raw: string): string | null {
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("+90")) s = s.slice(3);
  else if (s.startsWith("90") && s.length >= 12) s = s.slice(2);
  if (s.startsWith("0") && s.length === 11) s = s.slice(1);
  if (!/^5\d{9}$/.test(s)) return null;
  return s;
}

/** Veritabanı / gösterim için E.164 (+905xxxxxxxxxx). */
export function formatTrGsmE164(raw: string): string | null {
  const ten = normalizeTrGsmForNetgsm(raw);
  if (!ten) return null;
  return `+90${ten}`;
}

/** Saklı veya yapıştırılmış değerden UI için 10 hane (yoksa boş). */
export function trGsmTenDigitsFromAny(raw: string | null | undefined): string {
  return normalizeTrGsmForNetgsm(raw ?? "") ?? "";
}
