import { RoutePlanningSettingsForm } from "@/components/settings/route-planning-settings-form";
import { SettingsLogoForm } from "@/components/settings/settings-logo-form";
import { DataTableShell } from "@/components/module/data-table-shell";
import { getTenantBranding } from "@/lib/data/tenant-branding";
import { getRoutePlanningSettings } from "@/lib/data/tenant-route-settings";
import { tr } from "@/lib/i18n/tr";
import { isS3Configured } from "@/lib/storage/s3";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const branding = await getTenantBranding(ctx.tenantId);
  const routePlanning = await getRoutePlanningSettings(ctx.tenantId);
  const hasLogo = Boolean(branding?.logo_path);
  const cloudStorage = isS3Configured();

  return (
    <DataTableShell
      title={tr.nav.settings}
      description="Şirket bilgileri ve teklif PDF için logo."
      actions={null}
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">Dosya depolama</div>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
            {cloudStorage
              ? "Nesne depolama (S3 / Supabase Storage S3) yapılandırıldı — yeni yüklemeler bucket’a gider."
              : "Nesne depolama tanımlı değil — dosyalar yerel uploads/ altına yazılır (sunucusuz ortamda kalıcı olmayabilir)."}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">Şirket</div>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{branding?.name ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase text-slate-500">{tr.schedule.settingsRouteSection}</div>
          <RoutePlanningSettingsForm
            initialRadiusKm={routePlanning.cluster_radius_km}
            initialMaxUnitsPerCluster={routePlanning.max_units_per_cluster}
          />
        </div>
        <SettingsLogoForm hasLogo={hasLogo} />
      </div>
    </DataTableShell>
  );
}
