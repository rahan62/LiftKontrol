import { cn } from "@/lib/utils";

/** TS EN 81-20 madde bandı için Türkçe etiket (title / erişilebilirlik). */
export const TICKET_TIER_LABEL_TR: Record<string, string> = {
  green: "Yeşil",
  blue: "Mavi",
  yellow: "Sarı",
  red: "Kırmızı",
};

function swatchTone(tierNormalized: string): string {
  switch (tierNormalized) {
    case "green":
      return "bg-emerald-500";
    case "blue":
      return "bg-blue-600";
    case "yellow":
      return "bg-amber-400 dark:bg-amber-500";
    case "red":
      return "bg-red-600";
    default:
      return "bg-slate-400";
  }
}

type Props = {
  tier: string;
  /** Ek sınıflar — genişlik, hizalama vb. */
  className?: string;
};

/** Bilet bandını renkli dikdörtgen ile gösterir; Tooltip için `title` verilir (Türkçe). */
export function TicketTierSwatch({ tier, className }: Props) {
  const key = tier.trim().toLowerCase();
  const label = TICKET_TIER_LABEL_TR[key] ?? tier;
  const bg = swatchTone(key);

  return (
    <span
      role="img"
      aria-label={`Bilet bandı: ${label}`}
      title={label}
      className={cn(
        "inline-block h-4 w-10 shrink-0 rounded-sm border border-black/20 shadow-sm dark:border-white/25",
        bg,
        className,
      )}
    />
  );
}
