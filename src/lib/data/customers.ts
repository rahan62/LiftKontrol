import { isSupabaseConfigured } from "@/lib/auth/config";
import { getPool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";

export type CustomerRow = {
  id: string;
  code: string | null;
  legal_name: string;
  status: string;
  updated_at: string;
};

export async function listCustomers(tenantId: string): Promise<CustomerRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("customers")
      .select("id, code, legal_name, status, updated_at")
      .eq("tenant_id", tenantId)
      .order("legal_name");
    return (data ?? []) as CustomerRow[];
  }
  const pool = getPool();
  const { rows } = await pool.query<CustomerRow>(
    `SELECT id, code, legal_name, status, updated_at::text
     FROM customers WHERE tenant_id = $1 ORDER BY legal_name`,
    [tenantId],
  );
  return rows;
}

export async function getCustomer(
  tenantId: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    return data;
  }
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM customers WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    id,
  ]);
  return rows[0] ?? null;
}

export type CustomerPrimaryContactRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export async function getPrimaryCustomerContact(
  tenantId: string,
  customerId: string,
): Promise<CustomerPrimaryContactRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("customer_contacts")
      .select("id, name, phone, email")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .eq("is_primary", true)
      .maybeSingle();
    if (!data) return null;
    const r = data as Record<string, unknown>;
    return {
      id: String(r.id),
      name: String(r.name ?? ""),
      phone: r.phone != null ? String(r.phone) : null,
      email: r.email != null ? String(r.email) : null,
    };
  }
  const pool = getPool();
  const { rows } = await pool.query<CustomerPrimaryContactRow>(
    `SELECT id::text, name, phone, email FROM customer_contacts
     WHERE tenant_id = $1::uuid AND customer_id = $2::uuid AND is_primary = true
     LIMIT 1`,
    [tenantId, customerId],
  );
  return rows[0] ?? null;
}
