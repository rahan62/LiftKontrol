import { getTenantContext } from "@/lib/tenant/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Shown when the user is signed in but has no `tenant_members` row (no company membership yet).
 */
export default async function OnboardingPage() {
  const ctx = await getTenantContext();
  if (!ctx) {
    redirect("/login");
  }

  if (ctx.tenantId) {
    redirect("/app");
  }

  return (
    <div className="mx-auto max-w-lg px-8 py-12">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{tr.onboarding.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{tr.onboarding.body}</p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{tr.onboarding.hint}</p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <SignOutButton />
        <Link href="/" className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400">
          {tr.onboarding.returnHome}
        </Link>
      </div>
    </div>
  );
}
