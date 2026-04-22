import { createStockItemAction } from "@/actions/stock";
import { btnPrimary, field, label } from "@/components/forms/field-classes";
import { DataTableShell } from "@/components/module/data-table-shell";
import { ELEVATOR_SUBSYSTEMS, PART_CATEGORIES } from "@/lib/domain/elevator-parts";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";

export default function NewStockItemPage() {
  return (
    <DataTableShell
      title={tr.stock.newItem}
      description="Asansör yedek parçası: alt sistem, OEM, uyumluluk ve malzeme bilgisi ile kart oluşturun."
      actions={
        <Link
          href="/app/stock"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
        >
          {tr.common.cancel}
        </Link>
      }
    >
      <form action={createStockItemAction} className="mx-auto max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>{tr.stock.sku} *</label>
            <input name="sku" required className={field} placeholder="ör. DOOR-OP-001" />
          </div>
          <div>
            <label className={label}>{tr.stock.uom}</label>
            <input name="uom" className={field} defaultValue="ad" />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{tr.stock.descriptionCol} *</label>
            <input name="description" required className={field} placeholder="Kapı motoru, 230V, OEM eşdeğer" />
          </div>
          <div>
            <label className={label}>{tr.stock.subsystem}</label>
            <select name="subsystem" className={field} defaultValue="">
              <option value="">—</option>
              {ELEVATOR_SUBSYSTEMS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{tr.stock.category}</label>
            <select name="part_category" className={field} defaultValue="">
              <option value="">—</option>
              {PART_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{tr.stock.manufacturer}</label>
            <input name="manufacturer" className={field} />
          </div>
          <div>
            <label className={label}>{tr.stock.oem}</label>
            <input name="oem_part_number" className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Uyumluluk notları</label>
            <textarea name="compatibility_notes" rows={2} className={field} placeholder="Marka / model serileri" />
          </div>
          <div>
            <label className={label}>Malzeme / sınıf</label>
            <input name="material_grade" className={field} placeholder="ör. EN81 uyumlu" />
          </div>
          <div>
            <label className={label}>Referans birim maliyet (TRY)</label>
            <input name="unit_cost" type="number" step="any" min={0} className={field} />
          </div>
          <div>
            <label className={label}>Min stok</label>
            <input name="min_qty" type="number" step="any" min={0} className={field} />
          </div>
          <div>
            <label className={label}>Max stok</label>
            <input name="max_qty" type="number" step="any" min={0} className={field} />
          </div>
        </div>
        <button type="submit" className={btnPrimary}>
          {tr.common.save}
        </button>
      </form>
    </DataTableShell>
  );
}
