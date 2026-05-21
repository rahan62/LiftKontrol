import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

/** Whether a finance row exists for this elevator with the given substring in `notes`. */
export async function financeEntryExistsForAssetNotesContaining(
  tenantId: string,
  elevatorAssetId: string,
  notesSubstring: string,
): Promise<boolean> {
  /** PostgREST / SQL LIKE için joker kullan; yanlış eşleşmeyi engeller. */
  const pattern = `%${notesSubstring.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data, error } = await supabase
      .from("finance_entries")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("elevator_asset_id", elevatorAssetId)
      .like("notes", pattern)
      .limit(1)
      .maybeSingle();
    if (error) return true;
    return Boolean(data?.id);
  }
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM finance_entries
     WHERE tenant_id = $1 AND elevator_asset_id = $2 AND notes LIKE $3
     LIMIT 1`,
    [tenantId, elevatorAssetId, pattern],
  );
  return Boolean(rows[0]);
}
