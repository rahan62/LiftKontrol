import Link from "next/link";
import { notFound } from "next/navigation";
import { TENANT_ROLE_LABELS, TENANT_SYSTEM_ROLES } from "@/lib/constants/roles";
import { createClient } from "@/lib/supabase/server";
import {
  addMemberAction,
  addPaymentAction,
  addSubscriptionAction,
  deletePaymentAction,
  deleteSubscriptionAction,
  deleteTenantAction,
  removeMemberAction,
  updateMemberRoleAction,
  updateTenantAction,
} from "@/server/tenant-actions";

const tryFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

function okMessage(ok?: string | null) {
  switch (ok) {
    case "1":
      return "Kayıt güncellendi.";
    case "member":
      return "Kullanıcı eklendi.";
    case "role":
      return "Rol güncellendi.";
    case "removed":
      return "Üyelik kaldırıldı.";
    case "sub":
      return "Abonelik eklendi.";
    case "subdel":
      return "Abonelik silindi.";
    case "pay":
      return "Ödeme eklendi.";
    case "paydel":
      return "Ödeme silindi.";
    default:
      return null;
  }
}

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; note?: string }>;
}) {
  const { id: tenantId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: tenant, error: te } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  if (te || !tenant) {
    notFound();
  }

  const { data: members } = await supabase
    .from("tenant_members")
    .select("id, user_id, system_role, is_active")
    .eq("tenant_id", tenantId)
    .order("joined_at", { ascending: true });

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] as { id: string; email: string | null; full_name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: subscriptions } = await supabase
    .from("tenant_subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false });

  const { data: payments } = await supabase
    .from("tenant_payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("paid_at", { ascending: false });

  const flashOk = okMessage(sp.ok);
  const flashErr = sp.error ? decodeURIComponent(sp.error) : null;
  const flashNote = sp.note ? decodeURIComponent(sp.note) : null;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/tenants" className="text-sm text-amber-400 hover:text-amber-300">
          ← Firmalar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{tenant.name}</h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{tenant.slug}</p>
      </div>

      {flashOk ? (
        <p className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {flashOk}
        </p>
      ) : null}
      {flashErr ? (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {flashErr}
        </p>
      ) : null}
      {flashNote ? (
        <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {flashNote}
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Firma bilgileri</h2>
        <form action={updateTenantAction.bind(null, tenantId)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Ad *</label>
            <input
              name="name"
              required
              defaultValue={tenant.name}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Slug *</label>
            <input
              name="slug"
              required
              defaultValue={tenant.slug}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Durum</label>
            <select
              name="status"
              defaultValue={tenant.status}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="churned">churned</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Yasal unvan</label>
            <input
              name="legal_name"
              defaultValue={tenant.legal_name ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Vergi no</label>
            <input
              name="tax_id"
              defaultValue={tenant.tax_id ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Fatura e-posta</label>
            <input
              name="billing_email"
              type="email"
              defaultValue={tenant.billing_email ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Fatura telefon</label>
            <input
              name="billing_phone"
              defaultValue={tenant.billing_phone ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Sözleşme / fiyat özeti</label>
            <textarea
              name="contract_pricing_summary"
              rows={2}
              defaultValue={tenant.contract_pricing_summary ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Teklif notu (firma)</label>
            <textarea
              name="marketing_display_note"
              rows={2}
              defaultValue={tenant.marketing_display_note ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">İç notlar</label>
            <textarea
              name="notes_internal"
              rows={2}
              defaultValue={tenant.notes_internal ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Kaydet
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Kullanıcılar</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">E-posta</th>
                <th className="px-3 py-2">Ad</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Aktif</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(members ?? []).map((m) => {
                const p = profileById.get(m.user_id);
                return (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-slate-300">{p?.email ?? m.user_id}</td>
                    <td className="px-3 py-2 text-slate-400">{p?.full_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <form
                        action={updateMemberRoleAction.bind(null, tenantId, m.id)}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <select
                          name="system_role"
                          defaultValue={m.system_role}
                          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                        >
                          {TENANT_SYSTEM_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {TENANT_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                        >
                          Rolü kaydet
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{m.is_active ? "evet" : "hayır"}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={removeMemberAction.bind(null, tenantId, m.id)}>
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-300"
                          title="Üyeliği kaldır (auth kullanıcısı silinmez)"
                        >
                          Kaldır
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-sm font-medium text-slate-300">Kullanıcı ekle</h3>
        <form action={addMemberAction.bind(null, tenantId)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">E-posta</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Geçici şifre</label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Rol</label>
            <select
              name="system_role"
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {TENANT_SYSTEM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {TENANT_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Ekle
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Abonelikler</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(subscriptions ?? []).map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <span className="text-slate-300">
                {s.plan_code} · {s.status}
                {s.seat_limit != null ? ` · ${s.seat_limit} koltuk` : ""}
                {s.ends_at
                  ? ` · bitiş ${new Date(s.ends_at).toLocaleDateString("tr-TR")}`
                  : ""}
              </span>
              <form action={deleteSubscriptionAction.bind(null, tenantId, s.id)}>
                <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                  Sil
                </button>
              </form>
            </li>
          ))}
        </ul>
        {!subscriptions?.length ? <p className="mt-2 text-sm text-slate-500">Kayıt yok.</p> : null}

        <form action={addSubscriptionAction.bind(null, tenantId)} className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">Plan kodu</label>
            <input
              name="plan_code"
              defaultValue="standard"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Durum</label>
            <select name="status" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white">
              <option value="active">active</option>
              <option value="trial">trial</option>
              <option value="past_due">past_due</option>
              <option value="canceled">canceled</option>
              <option value="expired">expired</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Koltuk limiti</label>
            <input name="seat_limit" type="number" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Bitiş (ISO tarih)</label>
            <input name="ends_at" type="date" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Not</label>
            <input name="notes" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
              Abonelik ekle
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Ödemeler</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(payments ?? []).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <span className="text-slate-300">
                {tryFmt.format(p.amount_cents / 100)} · {p.currency} ·{" "}
                {new Date(p.paid_at).toLocaleString("tr-TR")}
                {p.description ? ` · ${p.description}` : ""}
              </span>
              <form action={deletePaymentAction.bind(null, tenantId, p.id)}>
                <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                  Sil
                </button>
              </form>
            </li>
          ))}
        </ul>
        {!payments?.length ? <p className="mt-2 text-sm text-slate-500">Kayıt yok.</p> : null}

        <form action={addPaymentAction.bind(null, tenantId)} className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">Tutar (TRY)</label>
            <input
              name="amount_try"
              required
              placeholder="12000"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Para birimi</label>
            <input name="currency" defaultValue="TRY" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Açıklama</label>
            <input name="description" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Harici ref (fatura no)</label>
            <input name="external_ref" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Ödeme tarihi</label>
            <input name="paid_at" type="datetime-local" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
              Ödeme ekle
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-200">Tehlikeli bölge</h2>
        <p className="mt-2 text-sm text-red-200/80">
          Firma silindiğinde tüm operasyonel veriler (iş emirleri, müşteriler, stok vb.) kalıcı olarak silinir.
        </p>
        <form action={deleteTenantAction.bind(null, tenantId)} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-red-300">Onay: slug yazın ({tenant.slug})</label>
            <input name="confirm_slug" required className="mt-1 rounded-md border border-red-900/50 bg-slate-950 px-3 py-2 font-mono text-white" />
          </div>
          <button type="submit" className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Firmayı sil
          </button>
        </form>
      </section>
    </div>
  );
}
