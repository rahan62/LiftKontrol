import Link from "next/link";
import { createTenantAction } from "@/server/tenant-actions";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/tenants" className="text-sm text-amber-400 hover:text-amber-300">
          ← Firmalar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Yeni firma</h1>
      </div>

      {sp.error ? (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {decodeURIComponent(sp.error)}
        </p>
      ) : null}

      <form action={createTenantAction} className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <div>
          <label className="text-xs font-medium text-slate-400">Firma adı *</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Slug (boş bırakılırsa üretilir)</label>
          <input name="slug" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white" />
          <p className="mt-1 text-xs text-slate-500">
            Tüm sistemde benzersiz olmalı. Doluysa otomatik olarak -2, -3… ile yeni bir slug atanır.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Durum</label>
          <select name="status" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="churned">churned</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Yasal unvan</label>
          <input name="legal_name" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Vergi no</label>
          <input name="tax_id" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Fatura e-posta</label>
          <input name="billing_email" type="email" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Fatura telefon</label>
          <input name="billing_phone" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Sözleşme / fiyat notu</label>
          <textarea name="contract_pricing_summary" rows={2} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Teklif / pazarlama notu (firma)</label>
          <textarea name="marketing_display_note" rows={2} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">İç notlar</label>
          <textarea name="notes_internal" rows={2} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>

        <hr className="border-slate-800" />
        <p className="text-xs text-slate-500">İsteğe bağlı: ilk firma sahibi hesabı</p>
        <div>
          <label className="text-xs font-medium text-slate-400">Sahip e-posta</label>
          <input name="owner_email" type="email" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Sahip şifre</label>
          <input name="owner_password" type="password" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>

        <button type="submit" className="mt-2 rounded-md bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400">
          Oluştur
        </button>
      </form>
    </div>
  );
}
