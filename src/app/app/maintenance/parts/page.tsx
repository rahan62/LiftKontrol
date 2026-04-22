import { PartsUsageForm } from "@/components/maintenance/parts-usage-form";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listAssetOptionsWithSite } from "@/lib/data/assets";
import { listStockItems } from "@/lib/data/stock";
import { listOpenRepairWorkOrdersForTenant } from "@/lib/data/work-orders";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function MaintenancePartsPage({
  searchParams,
}: {
  searchParams: Promise<{ asset_id?: string; site_id?: string; unit_code?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const [assets, stockItems, openRepairWorkOrders] = await Promise.all([
    listAssetOptionsWithSite(ctx.tenantId),
    listStockItems(ctx.tenantId, 500),
    listOpenRepairWorkOrdersForTenant(ctx.tenantId),
  ]);

  return (
    <DataTableShell
      title="Parça kullanımı"
      description="Stoktan çıkış, asansör bazlı borç kaydı (ödenmedi) ve stok düşümü. Onarım iş emrine bağlayabilirsiniz."
    >
      <PartsUsageForm
        assets={assets}
        stockItems={stockItems}
        openRepairWorkOrders={openRepairWorkOrders}
        defaultAssetId={sp.asset_id}
        defaultSiteId={sp.site_id}
        defaultUnitCode={sp.unit_code}
      />
    </DataTableShell>
  );
}
