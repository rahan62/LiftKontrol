import { DataTableShell } from "@/components/module/data-table-shell";
import { tr } from "@/lib/i18n/tr";

export default function WarehouseDashboardPage() {
  return (
    <DataTableShell
      title={`${tr.dashboard.warehouse} — panel`}
      description={tr.placeholders.moduleSoon}
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr.placeholders.moduleSoon}</p>
    </DataTableShell>
  );
}
