import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type TenantMemberProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  system_role: string;
};

export async function listTenantMemberProfiles(tenantId: string): Promise<TenantMemberProfileRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: members } = await supabase
      .from("tenant_members")
      .select("user_id, system_role")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    if (!members?.length) return [];
    const ids = members.map((m) => m.user_id as string);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
    const pmap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    return members.map((m) => {
      const p = pmap.get(m.user_id as string);
      return {
        user_id: m.user_id as string,
        full_name: (p?.full_name as string | null) ?? null,
        email: (p?.email as string | null) ?? null,
        system_role: m.system_role as string,
      };
    });
  }
  const pool = getPool();
  const { rows } = await pool.query<TenantMemberProfileRow>(
    `SELECT tm.user_id, p.full_name, p.email, tm.system_role
     FROM tenant_members tm
     JOIN profiles p ON p.id = tm.user_id
     WHERE tm.tenant_id = $1 AND tm.is_active = true
     ORDER BY COALESCE(p.full_name, p.email, tm.user_id::text)`,
    [tenantId],
  );
  return rows;
}
