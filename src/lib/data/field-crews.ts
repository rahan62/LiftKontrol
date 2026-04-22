import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type FieldCrewRow = {
  id: string;
  name: string;
};

export type FieldCrewMemberRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export async function listFieldCrews(tenantId: string): Promise<FieldCrewRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("field_crews")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name");
    return (data ?? []) as FieldCrewRow[];
  }
  const pool = getPool();
  const { rows } = await pool.query<FieldCrewRow>(
    `SELECT id, name FROM field_crews WHERE tenant_id = $1 ORDER BY name`,
    [tenantId],
  );
  return rows;
}

export async function listCrewMemberUserIds(tenantId: string, crewId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("field_crew_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("crew_id", crewId);
    return (data ?? []).map((r) => r.user_id as string);
  }
  const pool = getPool();
  const { rows } = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM field_crew_members WHERE tenant_id = $1 AND crew_id = $2`,
    [tenantId, crewId],
  );
  return rows.map((r) => r.user_id);
}

export async function listCrewMembersDetail(
  tenantId: string,
  crewId: string,
): Promise<FieldCrewMemberRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: mem } = await supabase
      .from("field_crew_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("crew_id", crewId);
    if (!mem?.length) return [];
    const ids = mem.map((m) => m.user_id as string);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
    const pmap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    return ids.map((uid) => {
      const p = pmap.get(uid);
      return {
        user_id: uid,
        full_name: (p?.full_name as string | null) ?? null,
        email: (p?.email as string | null) ?? null,
      };
    });
  }
  const pool = getPool();
  const { rows } = await pool.query<FieldCrewMemberRow>(
    `SELECT m.user_id, p.full_name, p.email
     FROM field_crew_members m
     JOIN profiles p ON p.id = m.user_id
     WHERE m.tenant_id = $1 AND m.crew_id = $2
     ORDER BY COALESCE(p.full_name, p.email)`,
    [tenantId, crewId],
  );
  return rows;
}
