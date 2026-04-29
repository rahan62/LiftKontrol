import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicElevatorHelpPanel } from "@/components/public/public-elevator-help-panel";
import { parseAssetUuidParam } from "@/lib/elevator-qr";
import { getElevatorPublicContext } from "@/lib/data/assets";
import { tr } from "@/lib/i18n/tr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ assetId: string }> };

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {
    title: `${tr.publicElevator.pageTitle} · Lift Kontrol`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicElevatorHelpPage({ params }: Props) {
  const { assetId: raw } = await params;
  const assetId = parseAssetUuidParam(raw);
  if (!assetId) notFound();

  const ctx = await getElevatorPublicContext(assetId);
  if (!ctx) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-900 hover:text-amber-700 dark:text-white dark:hover:text-amber-400"
          >
            Lift Kontrol
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {tr.publicElevator.pageTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tr.publicElevator.pageSubtitle}</p>
        <div className="mt-8">
          <PublicElevatorHelpPanel assetId={assetId} unitCode={ctx.unit_code} siteName={ctx.site_name} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
