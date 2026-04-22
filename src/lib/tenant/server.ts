import { isSupabaseConfigured } from "@/lib/auth/config";
import { getSessionUser } from "@/lib/auth/get-session";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type TenantContext = {
  userId: string;
  tenantId: string | null;
  role: string | null;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data: members } = await supabase
      .from("tenant_members")
      .select("tenant_id, system_role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);
    const row = members?.[0];
    return {
      userId: user.id,
      tenantId: row?.tenant_id ?? null,
      role: row?.system_role ?? null,
    };
  }

  const pool = getPool();
  const { rows } = await pool.query<{
    tenant_id: string;
    system_role: string;
  }>(
    `SELECT tenant_id, system_role FROM public.tenant_members
     WHERE user_id = $1 AND is_active = true LIMIT 1`,
    [user.id],
  );
  const row = rows[0];
  return {
    userId: user.id,
    tenantId: row?.tenant_id ?? null,
    role: row?.system_role ?? null,
  };
}
