import { getSessionUser } from "@/lib/auth/get-session";
import { selectPrimaryTenantMembershipForUser } from "@/lib/tenant/membership";

export type TenantContext = {
  userId: string;
  tenantId: string | null;
  role: string | null;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const membership = await selectPrimaryTenantMembershipForUser(user.id);
  return {
    userId: user.id,
    tenantId: membership?.tenantId ?? null,
    role: membership?.role ?? null,
  };
}
