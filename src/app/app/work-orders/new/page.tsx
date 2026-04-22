import { WorkOrderNewForm } from "@/components/work-orders/work-order-new-form";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listAssetOptionsWithSite } from "@/lib/data/assets";
import { listFieldCrews } from "@/lib/data/field-crews";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ asset_id?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const sp = await searchParams;
  const defaultAssetId = sp.asset_id?.trim();

  const [assets, fieldCrews] = await Promise.all([
    listAssetOptionsWithSite(ctx.tenantId),
    listFieldCrews(ctx.tenantId),
  ]);

  return (
    <DataTableShell title={tr.workOrders.newBreakdown} description={tr.workOrders.newBreakdownDescription}>
      <WorkOrderNewForm assets={assets} defaultAssetId={defaultAssetId} fieldCrews={fieldCrews} />
    </DataTableShell>
  );
}
