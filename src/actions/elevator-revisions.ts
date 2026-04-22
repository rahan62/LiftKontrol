"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/auth/require-tenant";
import { createElevatorRevisionForTenant } from "@/lib/data/create-elevator-revision-core";

export async function createElevatorRevisionAction(input: {
  periodicControlId: string;
  revisionArticleIds: string[];
}): Promise<{ ok: true; revisionId: string } | { ok: false; error: string }> {
  const tenantId = await requireTenantId();
  const result = await createElevatorRevisionForTenant(tenantId, input);
  if (!result.ok) return result;

  const { periodicControlId } = input;
  const revisionId = result.revisionId;

  revalidatePath("/app/periodic-controls");
  revalidatePath("/app/revisions");
  revalidatePath(`/app/periodic-controls/${periodicControlId}`);
  revalidatePath(`/app/revisions/${revisionId}`);

  return { ok: true, revisionId };
}
