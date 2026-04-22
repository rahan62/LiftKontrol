import { WorkOrderCompletePanel } from "@/components/work-orders/work-order-complete-panel";
import { WorkOrderBlockingCrewForm } from "@/components/work-orders/work-order-blocking-crew";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listFieldCrews } from "@/lib/data/field-crews";
import { getWorkOrder } from "@/lib/data/work-orders";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function WorkOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) notFound();

  const wo = await getWorkOrder(ctx.tenantId, id);
  if (!wo) notFound();

  const assetId = wo.elevator_asset_id ? String(wo.elevator_asset_id) : null;
  const fieldCrews = await listFieldCrews(ctx.tenantId);
  const blockingCrewRaw = wo.blocking_crew_id;
  const blockingCrewId =
    blockingCrewRaw !== null && blockingCrewRaw !== undefined ? String(blockingCrewRaw) : null;

  return (
    <DataTableShell
      title={`${tr.workOrders.number} ${String(wo.number ?? "")}`}
      description={tr.workOrders.description}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.workOrders.faultSymptom}</div>
          <p className="mt-2 text-slate-800 dark:text-slate-200">{String(wo.fault_symptom ?? "—")}</p>
          <p className="mt-1 text-xs text-slate-500">
            {tr.workOrders.type}: {String(wo.work_type ?? "—")} · {tr.workOrders.woStatus}:{" "}
            {String(wo.status ?? "—")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">Notlar</div>
          <p className="mt-2 text-slate-800 dark:text-slate-200">{String(wo.internal_notes ?? "—")}</p>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <WorkOrderBlockingCrewForm
            workOrderId={id}
            crews={fieldCrews}
            initialCrewId={blockingCrewId}
            workType={String(wo.work_type ?? "")}
            status={String(wo.status ?? "")}
          />
          <WorkOrderCompletePanel
            workOrderId={id}
            workOrderNumber={String(wo.number ?? id)}
            workType={String(wo.work_type ?? "")}
            status={String(wo.status ?? "")}
            elevatorAssetId={assetId}
          />
        </div>
      </div>
    </DataTableShell>
  );
}
