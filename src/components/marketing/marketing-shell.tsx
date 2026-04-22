import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export function MarketingShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100">
      <MarketingHeader />
      {title ? (
        <div className="border-b border-slate-800 bg-slate-950/80">
          <div className="mx-auto max-w-6xl px-6 py-2 text-xs text-slate-500 sm:text-sm">{title}</div>
        </div>
      ) : null}
      {children}
      <SiteFooter />
    </div>
  );
}
