"use client";

import { updateRoutePlanningSettingsAction } from "@/actions/route-planning-settings";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import {
  MAX_CLUSTER_RADIUS_KM,
  MAX_UNITS_PER_CLUSTER_CAP,
} from "@/lib/domain/route-planning-settings-constants";
import { tr } from "@/lib/i18n/tr";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  initialRadiusKm: number;
  initialMaxUnitsPerCluster: number;
};

export function RoutePlanningSettingsForm({
  initialRadiusKm,
  initialMaxUnitsPerCluster,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [radius, setRadius] = useState(initialRadiusKm);
  const [maxUnits, setMaxUnits] = useState(initialMaxUnitsPerCluster);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateRoutePlanningSettingsAction({
        cluster_radius_km: radius,
        max_units_per_cluster: maxUnits,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className={label} htmlFor="cluster-radius">
          {tr.schedule.clusterRadiusSetting}
        </label>
        <input
          id="cluster-radius"
          type="number"
          min={0.5}
          max={MAX_CLUSTER_RADIUS_KM}
          step={0.5}
          className={field}
          value={radius}
          onChange={(e) => setRadius(Number.parseFloat(e.target.value) || 2)}
        />
        <p className="mt-1 text-xs text-slate-500">{tr.schedule.clusterRadiusHint}</p>
      </div>
      <div>
        <label className={label} htmlFor="cluster-max-units">
          {tr.schedule.clusterMaxUnitsSetting}
        </label>
        <input
          id="cluster-max-units"
          type="number"
          min={1}
          max={MAX_UNITS_PER_CLUSTER_CAP}
          step={1}
          className={field}
          value={maxUnits}
          onChange={(e) => setMaxUnits(Number.parseInt(e.target.value, 10) || 10)}
        />
        <p className="mt-1 text-xs text-slate-500">{tr.schedule.clusterMaxUnitsHint}</p>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button type="button" className={btnPrimary} disabled={pending} onClick={() => void save()}>
        {pending ? tr.common.loading : tr.common.save}
      </button>
    </div>
  );
}
