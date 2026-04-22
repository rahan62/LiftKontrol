import { AssetForm } from "@/components/forms/asset-form";
import { listCustomers } from "@/lib/data/customers";
import { getSite, listSitesForCustomer } from "@/lib/data/sites";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; site_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const customers = await listCustomers(ctx.tenantId);
  const options = customers.map((c) => ({ id: c.id, legal_name: c.legal_name }));

  let defaultCustomerId = sp.customer_id;
  if (sp.site_id && !defaultCustomerId) {
    const site = await getSite(ctx.tenantId, sp.site_id);
    if (site?.customer_id) defaultCustomerId = String(site.customer_id);
  }

  const preferred =
    defaultCustomerId && customers.some((c) => c.id === defaultCustomerId)
      ? defaultCustomerId
      : customers[0]?.id ?? "";

  let initialSites: { id: string; name: string }[] = [];
  if (preferred) {
    initialSites = await listSitesForCustomer(ctx.tenantId, preferred);
  }

  const defaultSiteId =
    sp.site_id && initialSites.some((s) => s.id === sp.site_id) ? sp.site_id : undefined;

  return (
    <AssetForm
      mode="create"
      customers={options}
      defaultCustomerId={preferred || undefined}
      defaultSiteId={defaultSiteId}
      initialSites={initialSites}
    />
  );
}
