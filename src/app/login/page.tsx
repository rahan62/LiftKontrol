import { Suspense } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { tr } from "@/lib/i18n/tr";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <Suspense
          fallback={
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {tr.common.loading}
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
