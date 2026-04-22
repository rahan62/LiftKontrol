export const MAINTENANCE_FEE_PERIODS = [
  { value: "", label: "— Tanımsız" },
  { value: "monthly", label: "Aylık" },
  { value: "quarterly", label: "Üç aylık" },
  { value: "annual", label: "Yıllık" },
  { value: "per_visit", label: "Ziyaret başı" },
  { value: "custom", label: "Özel (notlara bakın)" },
] as const;

export const FINANCE_ENTRY_TYPES = [
  { value: "invoice", label: "Fatura" },
  { value: "payment", label: "Ödeme" },
  { value: "credit_note", label: "İade / mahsup" },
  { value: "fee", label: "Ücret / borç" },
  { value: "adjustment", label: "Düzeltme" },
  { value: "other", label: "Diğer" },
] as const;
