import { FinanceEntryForm } from "@/components/forms/finance-entry-form";
import { listAssetOptions } from "@/lib/data/assets";
import { listSites } from "@/lib/data/sites";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function NewFinanceEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ site_id?: string; asset_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const sites = await listSites(ctx.tenantId);
  const siteOptions = sites.map((s) => ({ id: s.id, name: s.name }));

  let assetOptions: { id: string; label: string }[] = [];
  try {
    const raw = await listAssetOptions(ctx.tenantId);
    assetOptions = raw.map((a) => ({
      id: a.id,
      label: `${a.unit_code} · ${a.site_name}`,
    }));
  } catch {
    assetOptions = [];
  }

  return (
    <FinanceEntryForm
      sites={siteOptions}
      assets={assetOptions}
      defaultSiteId={sp.site_id}
      defaultAssetId={sp.asset_id}
    />
  );
}
