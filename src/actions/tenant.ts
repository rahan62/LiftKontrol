"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Creates a tenant (service company) and attaches the current user as owner.
 * Intended for **internal / platform** provisioning flows only — not exposed as public self-registration.
 */
export async function createTenantWithOwner(name: string, slug: string) {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false as const, error: "Supabase is required for this action." };
  }
  const { data, error } = await supabase.rpc("create_tenant_with_owner", {
    p_name: name,
    p_slug: slug,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/app");
  return { ok: true as const, tenantId: data as string };
}
