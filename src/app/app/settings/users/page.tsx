import { DataTableShell } from "@/components/module/data-table-shell";

export default function UsersSettingsPage() {
  return (
    <DataTableShell
      title="Users & roles"
      description="Invite members, map `tenant_members.system_role`, optional permission overrides JSON."
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Granular permission keys are enforced in server actions and mirrored from role templates in application code.
      </p>
    </DataTableShell>
  );
}
