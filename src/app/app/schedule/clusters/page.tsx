import { DataTableShell } from "@/components/module/data-table-shell";
import { getTenantClusterState } from "@/lib/data/route-cluster-state";
import { getRoutePlanningSettings } from "@/lib/data/tenant-route-settings";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ScheduleClustersPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const state = await getTenantClusterState(ctx.tenantId);
  const routePlanning = await getRoutePlanningSettings(ctx.tenantId);

  return (
    <DataTableShell title={tr.schedule.clustersPageTitle} description={tr.schedule.clustersPageDescription}>
      {!state || !state.clusters.length ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Henüz küme verisi yok. Program sayfasından aylık plan üretin veya asansör / bakım kayıtlarını kontrol edin.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            {tr.schedule.clusterMaxUnitsSetting}: <strong>{routePlanning.max_units_per_cluster}</strong>
            {" · "}
            {tr.schedule.clusterRadiusSetting}: <strong>{state.radius_km}</strong> km
            {state.updated_at ? (
              <>
                {" "}
                · {tr.schedule.clusterUpdated}: {state.updated_at.slice(0, 16).replace("T", " ")}
              </>
            ) : null}
          </p>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {state.clusters.map((c) => (
              <li key={c.index} className="px-3 py-3 text-sm">
                <div className="font-medium text-slate-900 dark:text-white">
                  {tr.schedule.clusterIndex} #{c.index + 1} — {c.member_count ?? c.ordered_asset_ids.length}{" "}
                  ünite
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.ordered_asset_ids.slice(0, 24).map((id) => (
                    <Link
                      key={id}
                      href={`/app/assets/${id}`}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-amber-900 hover:underline dark:bg-slate-800 dark:text-amber-200"
                    >
                      {id.slice(0, 8)}…
                    </Link>
                  ))}
                  {c.ordered_asset_ids.length > 24 ? (
                    <span className="text-xs text-slate-500">+{c.ordered_asset_ids.length - 24}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DataTableShell>
  );
}
