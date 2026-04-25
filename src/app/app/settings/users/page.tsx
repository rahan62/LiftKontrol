import { DataTableShell } from "@/components/module/data-table-shell";
import { tr } from "@/lib/i18n/tr";

export default function UsersSettingsPage() {
  return (
    <DataTableShell title={tr.settingsUsers.title} description={tr.settingsUsers.description}>
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr.settingsUsers.body}</p>
    </DataTableShell>
  );
}
