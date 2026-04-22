"use client";

import { createBreakdownWorkOrderAction } from "@/actions/work-orders";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import type { AssetOptionWithSiteRow } from "@/lib/data/assets";
import type { FieldCrewRow } from "@/lib/data/field-crews";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  assets: AssetOptionWithSiteRow[];
  defaultAssetId?: string;
  fieldCrews?: FieldCrewRow[];
};

export function WorkOrderNewForm({ assets, defaultAssetId, fieldCrews = [] }: Props) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(
    defaultAssetId && assets.some((a) => a.id === defaultAssetId) ? defaultAssetId : (assets[0]?.id ?? ""),
  );
  const [fault, setFault] = useState("");
  const [workType, setWorkType] = useState<"repair" | "emergency_breakdown">("repair");
  const [emergency, setEmergency] = useState(false);
  const [blockingCrewId, setBlockingCrewId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError("Asansör seçin");
      return;
    }
    setPending(true);
    const res = await createBreakdownWorkOrderAction({
      elevator_asset_id: selected.id,
      fault_symptom: fault,
      work_type: workType,
      is_emergency: emergency || workType === "emergency_breakdown",
      blocking_crew_id: blockingCrewId.trim() || null,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/app/work-orders/${res.id}`);
    router.refresh();
  }

  if (!assets.length) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Önce en az bir asansör kaydı oluşturun.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4">
      <div>
        <label className={label}>{tr.assets.unit} / {tr.assets.site}</label>
        <select className={field} value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.unit_code} · {a.site_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>{tr.workOrders.workTypeRepair} / {tr.workOrders.workTypeEmergency}</label>
        <select
          className={field}
          value={workType}
          onChange={(e) => {
            const v = e.target.value as "repair" | "emergency_breakdown";
            setWorkType(v);
            if (v === "emergency_breakdown") setEmergency(true);
          }}
        >
          <option value="repair">{tr.workOrders.workTypeRepair}</option>
          <option value="emergency_breakdown">{tr.workOrders.workTypeEmergency}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="wo-emergency"
          type="checkbox"
          checked={emergency}
          onChange={(e) => setEmergency(e.target.checked)}
        />
        <label htmlFor="wo-emergency" className="text-sm text-slate-700 dark:text-slate-300">
          {tr.workOrders.emergency}
        </label>
      </div>

      {fieldCrews.length > 0 ? (
        <div>
          <label className={label}>{tr.workOrders.blockingCrewOptional}</label>
          <select
            className={field}
            value={blockingCrewId}
            onChange={(e) => setBlockingCrewId(e.target.value)}
          >
            <option value="">{tr.workOrders.blockingCrewNone}</option>
            {fieldCrews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className={label}>{tr.workOrders.faultSymptom}</label>
        <textarea className={field} rows={3} value={fault} onChange={(e) => setFault(e.target.value)} required />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? tr.common.loading : tr.workOrders.createOpen}
        </button>
        <Link
          href="/app/work-orders"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      </div>
    </form>
  );
}
