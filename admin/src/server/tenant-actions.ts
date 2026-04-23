"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { TenantSystemRole } from "@/lib/constants/roles";
import { TENANT_SYSTEM_ROLES } from "@/lib/constants/roles";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function parseRole(r: string): TenantSystemRole | null {
  return (TENANT_SYSTEM_ROLES as readonly string[]).includes(r) ? (r as TenantSystemRole) : null;
}

function q(msg: string) {
  return encodeURIComponent(msg);
}

function emptyToNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

/** Pick a slug not present in tenants.slug (optional: ignore current row on edit). */
async function resolveUniqueTenantSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawSlug: string,
  excludeTenantId?: string,
): Promise<string> {
  let base = rawSlug.trim().toLowerCase().replace(/-+$/, "").replace(/^-+/g, "");
  if (!base) {
    base = "tenant";
  }
  for (let n = 0; n < 500; n++) {
    const candidate = (n === 0 ? base : `${base}-${n + 1}`).slice(0, 64);
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) {
      return candidate;
    }
    if (excludeTenantId && existing.id === excludeTenantId) {
      return candidate;
    }
  }
  return `${base}-${Date.now()}`.slice(0, 64);
}

async function linkOrCreateOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient();
  const { data: created, error: ce } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0] },
  });

  let userId: string | null = null;
  if (ce) {
    const msg = (ce.message || "").toLowerCase();
    const dup =
      msg.includes("already") ||
      msg.includes("registered") ||
      ce.code === "email_exists" ||
      (ce as { code?: string }).code === "email_exists";
    if (!dup) {
      return { ok: false, error: ce.message };
    }
    const pool = getPool();
    const r = await pool.query<{ id: string }>(
      "SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    if (!r.rows.length) {
      return { ok: false, error: ce.message };
    }
    userId = r.rows[0].id;
  } else if (created.user) {
    userId = created.user.id;
  }

  if (!userId) {
    return { ok: false, error: "Kullanıcı oluşturulamadı." };
  }

  const { error: me } = await supabase.from("tenant_members").upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      system_role: "tenant_owner",
      is_active: true,
    },
    { onConflict: "tenant_id,user_id" },
  );
  if (me) {
    return { ok: false, error: me.message };
  }
  return { ok: true };
}

export async function createTenantAction(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  let slug = String(formData.get("slug") || "").trim().toLowerCase();
  if (!name) {
    redirect(`/tenants/new?error=${q("Firma adı gerekli.")}`);
  }
  if (!slug) {
    slug = slugify(name);
  }
  if (!slug) {
    slug = "tenant";
  }

  const requestedSlug = slug;
  slug = await resolveUniqueTenantSlug(supabase, slug);

  const row = {
    name,
    slug,
    legal_name: emptyToNull(formData, "legal_name"),
    tax_id: emptyToNull(formData, "tax_id"),
    billing_email: emptyToNull(formData, "billing_email"),
    billing_phone: emptyToNull(formData, "billing_phone"),
    status: String(formData.get("status") || "active"),
    contract_pricing_summary: emptyToNull(formData, "contract_pricing_summary"),
    marketing_display_note: emptyToNull(formData, "marketing_display_note"),
    notes_internal: emptyToNull(formData, "notes_internal"),
  };

  const { data, error } = await supabase.from("tenants").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505" || error.message.includes("tenants_slug_key")) {
      redirect(
        `/tenants/new?error=${q("Slug çakışması (eşzamanlı kayıt). Lütfen farklı bir slug ile tekrar deneyin.")}`,
      );
    }
    redirect(`/tenants/new?error=${q(error.message)}`);
  }

  const ownerEmail = String(formData.get("owner_email") || "").trim();
  const ownerPassword = String(formData.get("owner_password") || "").trim();
  if (ownerEmail && ownerPassword) {
    const u = await linkOrCreateOwner(supabase, data.id, ownerEmail, ownerPassword);
    if (!u.ok) {
      redirect(`/tenants/new?error=${q(u.error)}`);
    }
  }

  revalidatePath("/tenants");
  if (slug !== requestedSlug) {
    redirect(
      `/tenants/${data.id}?note=${q(`"${requestedSlug}" kullanılıyordu; slug "${slug}" olarak kaydedildi.`)}`,
    );
  }
  redirect(`/tenants/${data.id}`);
}

export async function updateTenantAction(tenantId: string, formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const row = {
    name: String(formData.get("name") || "").trim(),
    slug: String(formData.get("slug") || "").trim().toLowerCase(),
    legal_name: emptyToNull(formData, "legal_name"),
    tax_id: emptyToNull(formData, "tax_id"),
    billing_email: emptyToNull(formData, "billing_email"),
    billing_phone: emptyToNull(formData, "billing_phone"),
    status: String(formData.get("status") || "active"),
    contract_pricing_summary: emptyToNull(formData, "contract_pricing_summary"),
    marketing_display_note: emptyToNull(formData, "marketing_display_note"),
    notes_internal: emptyToNull(formData, "notes_internal"),
  };

  if (!row.name || !row.slug) {
    redirect(`/tenants/${tenantId}?error=${q("Ad ve slug gerekli.")}`);
  }

  const { data: slugOwner } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", row.slug)
    .maybeSingle();
  if (slugOwner && slugOwner.id !== tenantId) {
    redirect(
      `/tenants/${tenantId}?error=${q("Bu kısa ad (slug) başka bir firmada kayıtlı. Farklı bir slug seçin.")}`,
    );
  }

  const { error } = await supabase.from("tenants").update(row).eq("id", tenantId);
  if (error) {
    if (error.code === "23505" || error.message.includes("tenants_slug_key")) {
      redirect(
        `/tenants/${tenantId}?error=${q("Bu slug zaten kullanılıyor. Başka bir kısa ad deneyin.")}`,
      );
    }
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=1`);
}

export async function deleteTenantAction(tenantId: string, formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const confirmSlug = String(formData.get("confirm_slug") || "").trim().toLowerCase();
  const { data: t } = await supabase.from("tenants").select("slug").eq("id", tenantId).single();
  if (!t || t.slug !== confirmSlug) {
    redirect(`/tenants/${tenantId}?error=${q("Silmek için slug ile onaylayın.")}`);
  }
  const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath("/tenants");
  redirect("/tenants?ok=deleted");
}

export async function addMemberAction(tenantId: string, formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const role = parseRole(String(formData.get("system_role") || ""));
  if (!email || !password || !role) {
    redirect(`/tenants/${tenantId}?error=${q("E-posta, şifre ve rol gerekli.")}`);
  }

  const service = createServiceClient();
  const { data: created, error: ce } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string | null = null;
  if (ce) {
    const msg = (ce.message || "").toLowerCase();
    const dup = msg.includes("already") || msg.includes("registered");
    if (!dup) {
      redirect(`/tenants/${tenantId}?error=${q(ce.message)}`);
    }
    const pool = getPool();
    const r = await pool.query<{ id: string }>(
      "SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    if (!r.rows.length) {
      redirect(`/tenants/${tenantId}?error=${q(ce.message)}`);
    }
    userId = r.rows[0].id;
  } else if (created.user) {
    userId = created.user.id;
  }

  if (!userId) {
    redirect(`/tenants/${tenantId}?error=${q("Kullanıcı oluşturulamadı.")}`);
  }

  const { error: me } = await supabase.from("tenant_members").upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      system_role: role,
      is_active: true,
    },
    { onConflict: "tenant_id,user_id" },
  );
  if (me) {
    redirect(`/tenants/${tenantId}?error=${q(me.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=member`);
}

export async function updateMemberRoleAction(
  tenantId: string,
  memberId: string,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const role = parseRole(String(formData.get("system_role") || ""));
  if (!role) {
    redirect(`/tenants/${tenantId}?error=${q("Geçersiz rol.")}`);
  }
  const { error } = await supabase
    .from("tenant_members")
    .update({ system_role: role })
    .eq("id", memberId)
    .eq("tenant_id", tenantId);
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=role`);
}

export async function removeMemberAction(tenantId: string, memberId: string) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_members")
    .delete()
    .eq("id", memberId)
    .eq("tenant_id", tenantId);
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=removed`);
}

export async function addSubscriptionAction(tenantId: string, formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const plan_code = String(formData.get("plan_code") || "standard").trim();
  const status = String(formData.get("status") || "active");
  const notes = emptyToNull(formData, "notes");
  const seatRaw = String(formData.get("seat_limit") || "").trim();
  const seat_limit = seatRaw ? parseInt(seatRaw, 10) : null;
  const endsRaw = String(formData.get("ends_at") || "").trim();

  const { error } = await supabase.from("tenant_subscriptions").insert({
    tenant_id: tenantId,
    plan_code,
    status,
    notes,
    seat_limit: Number.isFinite(seat_limit) ? seat_limit : null,
    ends_at: endsRaw ? new Date(endsRaw).toISOString() : null,
  });
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=sub`);
}

export async function deleteSubscriptionAction(tenantId: string, subscriptionId: string) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("tenant_id", tenantId);
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=subdel`);
}

export async function addPaymentAction(tenantId: string, formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const amountStr = String(formData.get("amount_try") || "").replace(",", ".").trim();
  const amount = parseFloat(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/tenants/${tenantId}?error=${q("Geçerli tutar girin (TRY).")}`);
  }
  const amount_cents = Math.round(amount * 100);
  const currency = String(formData.get("currency") || "TRY").trim() || "TRY";
  const description = emptyToNull(formData, "description");
  const external_ref = emptyToNull(formData, "external_ref");
  const paidRaw = String(formData.get("paid_at") || "").trim();

  const { error } = await supabase.from("tenant_payments").insert({
    tenant_id: tenantId,
    amount_cents,
    currency,
    description,
    external_ref,
    paid_at: paidRaw ? new Date(paidRaw).toISOString() : new Date().toISOString(),
  });
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=pay`);
}

export async function deletePaymentAction(tenantId: string, paymentId: string) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_payments")
    .delete()
    .eq("id", paymentId)
    .eq("tenant_id", tenantId);
  if (error) {
    redirect(`/tenants/${tenantId}?error=${q(error.message)}`);
  }
  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?ok=paydel`);
}
