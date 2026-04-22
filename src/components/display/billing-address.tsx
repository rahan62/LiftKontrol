type BillingJson = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

export function BillingAddressCard({ billing }: { billing: unknown }) {
  if (billing == null || (typeof billing === "object" && billing !== null && Object.keys(billing).length === 0)) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No billing address on file.</p>;
  }

  if (typeof billing !== "object" || billing === null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">—</p>;
  }

  const o = billing as BillingJson;
  const line1 = str(o.line1);
  const city = str(o.city);
  const region = str(o.region);
  const postal = str(o.postal_code);
  const country = str(o.country);

  const line2 = [city, region].filter(Boolean).join(", ");
  const line3 = [postal, country].filter(Boolean).join(" · ");

  return (
    <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
      {line1 ? <div className="font-medium">{line1}</div> : null}
      {line2 ? <div>{line2}</div> : null}
      {line3 ? <div className="text-slate-600 dark:text-slate-400">{line3}</div> : null}
      {!line1 && !line2 && !line3 ? (
        <p className="text-slate-500">Structured fields are empty.</p>
      ) : null}
    </div>
  );
}
