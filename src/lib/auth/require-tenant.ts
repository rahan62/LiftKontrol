import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export async function requireTenantId(): Promise<string> {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    redirect("/app/onboarding");
  }
  return ctx.tenantId;
}
