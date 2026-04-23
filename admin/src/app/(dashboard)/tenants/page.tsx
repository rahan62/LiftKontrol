import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function flashMessage(ok?: string | null) {
  if (ok === "deleted") return "Firma silindi.";
  return null;
}

export default async function TenantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const flash = flashMessage(sp.ok);

  const supabase = await createClient();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, status, billing_email, created_at, legal_name",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-200">
        Liste yüklenemedi: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Firmalar</h1>
          <p className="mt-1 text-sm text-slate-500">Çok kiracılı müşteriler (tenants)</p>
        </div>
        <Link
          href="/tenants/new"
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          Yeni firma
        </Link>
      </div>

      {flash ? (
        <p className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {flash}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Fatura e-posta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(tenants ?? []).map((t) => (
              <tr key={t.id} className="hover:bg-slate-900/40">
                <td className="px-4 py-3 text-slate-200">
                  <span className="font-medium">{t.name}</span>
                  {t.legal_name ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{t.legal_name}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{t.slug}</td>
                <td className="px-4 py-3 text-slate-400">{t.status}</td>
                <td className="px-4 py-3 text-slate-400">{t.billing_email ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/tenants/${t.id}`}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    Detay
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tenants?.length ? (
          <p className="p-6 text-center text-sm text-slate-500">Henüz firma yok.</p>
        ) : null}
      </div>
    </div>
  );
}
