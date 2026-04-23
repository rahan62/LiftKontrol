import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PrimaryTenantMembership = {
  tenantId: string;
  role: string | null;
};

/**
 * Aktif kiracı üyeliği: `joined_at` artan sıra — ilk üyelik “ana firma” kabul edilir.
 * (Çoklu üyelikte ileride cookie ile seçim eklenebilir.)
 */
export async function selectPrimaryTenantMembershipForUser(
  userId: string,
): Promise<PrimaryTenantMembership | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    return selectPrimaryTenantMembershipWithClient(supabase, userId);
  }

  const pool = getPool();
  const { rows } = await pool.query<{ tenant_id: string; system_role: string }>(
    `SELECT tenant_id::text, system_role
     FROM public.tenant_members
     WHERE user_id = $1 AND is_active = true
     ORDER BY joined_at ASC NULLS LAST
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row?.tenant_id) return null;
  return { tenantId: row.tenant_id, role: row.system_role ?? null };
}

/** Mobil Bearer oturumu gibi özel Supabase istemcileri için. */
export async function selectPrimaryTenantMembershipWithClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrimaryTenantMembership | null> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, system_role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.tenant_id) return null;
  return { tenantId: String(data.tenant_id), role: (data.system_role as string | null) ?? null };
}
