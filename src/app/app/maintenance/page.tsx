import { MaintenanceMonthClient } from "@/components/maintenance/maintenance-month-client";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listElevatorMonthOverview } from "@/lib/data/maintenance";
import { firstDayOfMonth } from "@/lib/domain/maintenance-month";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const now = new Date();
  const y = sp.y ? Number.parseInt(sp.y, 10) : now.getFullYear();
  const m = sp.m ? Number.parseInt(sp.m, 10) : now.getMonth() + 1;
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    redirect("/app/maintenance");
  }

  const ym = firstDayOfMonth(y, m);
  const rows = await listElevatorMonthOverview(ctx.tenantId, ym);

  return (
    <DataTableShell title={tr.maintenance.title} description={tr.maintenance.description}>
      <MaintenanceMonthClient year={y} month={m} initialRows={rows} />
    </DataTableShell>
  );
}
