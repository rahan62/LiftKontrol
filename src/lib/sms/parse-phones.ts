import { normalizeTrGsmForNetgsm } from "@/lib/sms/phone-tr";

/** Serbest metindeki (bina acil telefonları vb.) Türkiye GSM numaralarını çıkarır; 10 hane, tekrarsız. */
export function extractTrGsmFromFreeText(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const seen = new Set<string>();
  const addRaw = (raw: string) => {
    const n = normalizeTrGsmForNetgsm(raw);
    if (n) seen.add(n);
  };

  for (const chunk of text.split(/[,;/|\n\r]+/)) {
    const t = chunk.trim();
    if (t) addRaw(t);
  }

  const collapsed = text.replace(/\D/g, "");
  for (let i = 0; i <= collapsed.length - 10; i++) {
    if (collapsed[i] === "5") {
      addRaw(collapsed.slice(i, i + 10));
    }
  }

  return [...seen];
}
