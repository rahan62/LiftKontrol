import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { tr } from "@/lib/i18n/tr";

/**
 * Public registration is disabled. Companies are onboarded by the vendor; admins add users internally.
 */
export default function SignupPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-center text-lg font-semibold text-slate-900 dark:text-white">{tr.signup.title}</h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">{tr.signup.intro}</p>
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">{tr.signup.customersNote}</p>
          <div className="mt-8 flex flex-col gap-2">
            <Link
              href="/login"
              className="block w-full rounded-md bg-slate-900 py-2.5 text-center text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {tr.signup.signIn}
            </Link>
            <Link
              href="/"
              className="block w-full rounded-md border border-slate-300 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {tr.signup.backHome}
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
