import { AppWorkspaceShell } from "@/components/layout/app-workspace-shell";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ctx = await getTenantContext();
  if (!ctx) {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const needsTenant =
    pathname.startsWith("/app") &&
    !pathname.startsWith("/app/onboarding");

  if (needsTenant && !ctx.tenantId) {
    redirect("/app/onboarding");
  }

  return (
    <AppWorkspaceShell tenantLine={ctx.tenantId ? tr.layout.workspace : tr.layout.awaitingTenant}>
      {children}
    </AppWorkspaceShell>
  );
}
