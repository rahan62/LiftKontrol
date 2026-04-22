import type { SupabaseClient } from "@supabase/supabase-js";

export type DomainEventInput = {
  tenantId: string;
  eventType: string;
  actorType: "user" | "system" | "customer" | "integration";
  actorId?: string | null;
  objectType: string;
  objectId: string;
  visibility?: "internal" | "customer_visible";
  payload?: Record<string, unknown>;
  note?: string | null;
};

/**
 * Append-only operational event — feeds timelines for customer, site, asset, WO, contract, stock, employee.
 */
export async function emitDomainEvent(
  supabase: SupabaseClient,
  input: DomainEventInput,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("domain_events").insert({
    tenant_id: input.tenantId,
    event_type: input.eventType,
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    object_type: input.objectType,
    object_id: input.objectId,
    visibility: input.visibility ?? "internal",
    payload: input.payload ?? {},
    note: input.note ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}
