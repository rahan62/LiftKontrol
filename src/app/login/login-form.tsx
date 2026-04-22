"use client";

import { useActionState } from "react";
import { localLoginAction, supabaseLoginAction, type LoginActionState } from "@/app/login/actions";
import { BrandLogo } from "@/components/layout/brand-logo";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { tr } from "@/lib/i18n/tr";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const loginAction = isSupabaseConfigured() ? supabaseLoginAction : localLoginAction;
  const [state, formAction, pending] = useActionState(loginAction, null as LoginActionState);

  const error = state?.error ?? null;

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex justify-center">
        <BrandLogo height={72} priority className="max-w-[12rem]" />
      </div>
      <h1 className="text-center text-lg font-semibold text-slate-900 dark:text-white">{tr.auth.signIn}</h1>
      <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">{tr.auth.tagline}</p>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="login-email">
            {tr.auth.email}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="login-password">
            {tr.auth.password}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="login-remember"
            name="remember"
            type="checkbox"
            value="1"
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-950"
          />
          <label htmlFor="login-remember" className="text-sm text-slate-600 dark:text-slate-400">
            {tr.auth.rememberMe}
          </label>
        </div>
        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {pending ? tr.auth.signingIn : tr.auth.signIn}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">{tr.auth.noPublicSignup}</p>
    </div>
  );
}
