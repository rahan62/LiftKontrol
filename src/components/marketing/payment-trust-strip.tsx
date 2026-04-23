/**
 * iyzico logo paketi: Visa, Mastercard, Troy ve "iyzico ile Öde" tek şeritte.
 * Kaynak: https://docs.iyzico.com/ek-bilgiler/iyzico-logo-paketi
 */
export function PaymentTrustStrip({
  className = "",
  showSslNote = true,
  compact = false,
}: {
  className?: string;
  showSslNote?: boolean;
  /** Footer gibi dar alanlarda daha küçük şerit. */
  compact?: boolean;
}) {
  const imgClass = compact
    ? "h-4 w-auto max-w-[min(100%,20rem)] opacity-90 sm:h-5"
    : "h-8 w-auto max-w-full opacity-95";
  const noteClass = compact
    ? "max-w-lg text-center text-[10px] leading-snug text-slate-500 sm:text-xs"
    : "max-w-md text-center text-xs leading-relaxed text-slate-500";
  const gap = compact ? "gap-1.5" : "gap-3";

  return (
    <div className={`flex flex-col items-center ${gap} ${className}`}>
      <img
        src="/payments/iyzico-logo-band-white.svg"
        alt="Troy, Visa, Mastercard ve iyzico ile öde"
        width={456}
        height={32}
        className={imgClass}
        loading="lazy"
        decoding="async"
      />
      {showSslNote ? (
        <p className={noteClass}>
          Web sitemiz yayında güvenli bağlantı (HTTPS / SSL) ile sunulur. Kart bilgileriniz iyzico güvenli
          ödeme altyapısında işlenir; tarafımızca saklanmaz.
        </p>
      ) : null}
    </div>
  );
}
