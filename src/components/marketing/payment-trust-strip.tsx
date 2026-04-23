/**
 * iyzico logo paketi: Visa, Mastercard, Troy ve "iyzico ile Öde" tek şeritte.
 * Kaynak: https://docs.iyzico.com/ek-bilgiler/iyzico-logo-paketi
 */
export function PaymentTrustStrip({
  className = "",
  showSslNote = true,
}: {
  className?: string;
  showSslNote?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <img
        src="/payments/iyzico-logo-band-white.svg"
        alt="Troy, Visa, Mastercard ve iyzico ile öde"
        width={456}
        height={32}
        className="h-8 w-auto max-w-full opacity-95"
        loading="lazy"
        decoding="async"
      />
      {showSslNote ? (
        <p className="max-w-md text-center text-xs leading-relaxed text-slate-500">
          Web sitemiz yayında güvenli bağlantı (HTTPS / SSL) ile sunulur. Kart bilgileriniz iyzico güvenli
          ödeme altyapısında işlenir; tarafımızca saklanmaz.
        </p>
      ) : null}
    </div>
  );
}
