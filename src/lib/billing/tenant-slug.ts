import type { SupabaseClient } from "@supabase/supabase-js";

export function slugifyTenantName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Service-role client: RLS bypass; slug must be unique on `tenants.slug`. */
export async function resolveUniqueTenantSlug(
  service: SupabaseClient,
  rawSlug: string,
): Promise<string> {
  let base = rawSlug.trim().toLowerCase().replace(/-+$/, "").replace(/^-+/g, "");
  if (!base) base = "tenant";
  for (let n = 0; n < 500; n++) {
    const candidate = (n === 0 ? base : `${base}-${n + 1}`).slice(0, 64);
    const { data: existing } = await service.from("tenants").select("id").eq("slug", candidate).maybeSingle();
    if (!existing) return candidate;
  }
  return `${base}-${Date.now()}`.slice(0, 64);
}
