"use client";

import { recordPartsUsageAction } from "@/actions/parts-usage";
import { PARTS_USAGE_REVISION_REPAIR_HINT } from "@/lib/domain/en8120";
import { tr } from "@/lib/i18n/tr";
import type { PartsLine, WorkType } from "@/lib/data/parts-usage";
import type { AssetOptionWithSiteRow } from "@/lib/data/assets";
import type { OpenRepairWorkOrderRow } from "@/lib/data/work-orders";
import type { StockItemRow } from "@/lib/data/stock";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: "maintenance", label: "Bakım" },
  { value: "revision", label: "Revizyon" },
  { value: "repair", label: "Onarım" },
  { value: "assembly", label: "Montaj" },
];

type Props = {
  assets: AssetOptionWithSiteRow[];
  stockItems: StockItemRow[];
  openRepairWorkOrders: OpenRepairWorkOrderRow[];
  defaultAssetId?: string;
  defaultSiteId?: string;
  defaultUnitCode?: string;
};

export function PartsUsageForm({
  assets,
  stockItems,
  openRepairWorkOrders,
  defaultAssetId,
  defaultSiteId,
  defaultUnitCode,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [workType, setWorkType] = useState<WorkType>("maintenance");
  const [assetId, setAssetId] = useState(
    defaultAssetId && assets.some((a) => a.id === defaultAssetId)
      ? defaultAssetId
      : assets[0]?.id ?? "",
  );
  const [lines, setLines] = useState<{ stock_item_id: string; qty: string; unit_price: string }[]>([
    { stock_item_id: stockItems[0]?.id ?? "", qty: "1", unit_price: "" },
  ]);
  const [workOrderId, setWorkOrderId] = useState("");

  const selected = useMemo(() => assets.find((a) => a.id === assetId), [assets, assetId]);

  const ordersForAsset = useMemo(() => {
    if (!selected) return [];
    return openRepairWorkOrders.filter(
      (w) => w.elevator_asset_id && w.elevator_asset_id === selected.id,
    );
  }, [openRepairWorkOrders, selected]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError("Asansör seçin");
      return;
    }
    const parsed: PartsLine[] = [];
    for (const ln of lines) {
      const qty = Number.parseFloat(ln.qty);
      const unit_price = Number.parseFloat(ln.unit_price);
      if (!ln.stock_item_id || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unit_price)) {
        setError("Her satırda geçerli parça, miktar ve birim fiyat girin");
        return;
      }
      parsed.push({ stock_item_id: ln.stock_item_id, qty, unit_price });
    }
    setPending(true);
    const res = await recordPartsUsageAction({
      elevator_asset_id: selected.id,
      site_id: selected.site_id,
      work_type: workType,
      unit_code: selected.unit_code,
      monthly_maintenance_id: null,
      work_order_id: workOrderId.trim() || null,
      lines: parsed,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/app/maintenance");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Parça çıkışı</h2>
        <Link href="/app/maintenance" className="text-sm text-slate-600 hover:underline dark:text-slate-400">
          ← Bakıma dön
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Asansör</label>
          <select
            className={field}
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            required
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.unit_code} · {a.site_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>İş türü</label>
          <select
            className={field}
            value={workType}
            onChange={(e) => setWorkType(e.target.value as WorkType)}
          >
            {WORK_TYPES.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{tr.workOrders.optionalWorkOrder}</label>
          {ordersForAsset.length ? (
            <select
              className={field}
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
            >
              <option value="">—</option>
              {ordersForAsset.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.number}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-slate-500">{tr.workOrders.noOpenWorkOrderForAsset}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="text-xs font-semibold uppercase text-slate-500">Parça satırları</div>
        <p className="mt-1 text-xs text-slate-500">
          Stok düşer; sahaya borç kaydı (ödenmedi) oluşturulur. Miktar ve birim fiyat satır bazında girilir.{" "}
          {PARTS_USAGE_REVISION_REPAIR_HINT}
        </p>
        <div className="mt-3 space-y-2">
          {lines.map((ln, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-5">
                {i === 0 ? <label className={label}>Parça</label> : null}
                <select
                  className={field}
                  value={ln.stock_item_id}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], stock_item_id: e.target.value };
                    setLines(next);
                  }}
                >
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sku} — {s.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                {i === 0 ? <label className={label}>Miktar</label> : null}
                <input
                  className={field}
                  type="number"
                  min={0.001}
                  step="any"
                  value={ln.qty}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], qty: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                {i === 0 ? <label className={label}>Birim fiyat (TRY)</label> : null}
                <input
                  className={field}
                  type="number"
                  step="any"
                  min={0}
                  value={ln.unit_price}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], unit_price: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="text-xs text-rose-600"
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                >
                  Satırı sil
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-amber-700 dark:text-amber-400"
            onClick={() =>
              setLines([...lines, { stock_item_id: stockItems[0]?.id ?? "", qty: "1", unit_price: "" }])
            }
          >
            + Satır ekle
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? tr.common.loading : "Kaydet (stok düş + finans)"}
      </button>
    </form>
  );
}
