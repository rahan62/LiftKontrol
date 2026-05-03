"use client";

import { useActionState, useMemo, useState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/actions/change-password";
import { tr } from "@/lib/i18n/tr";

const initial: ChangePasswordState = { ok: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const borderClass = useMemo(() => {
    if (passwordConfirm.length === 0) return "border-slate-300 dark:border-slate-700";
    if (password !== passwordConfirm) return "border-red-500 dark:border-red-500";
    if (password.length >= 8) return "border-green-600 dark:border-green-600";
    return "border-amber-500 dark:border-amber-600";
  }, [password, passwordConfirm]);

  const canSubmit = password.length >= 8 && password === passwordConfirm && !pending;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-semibold uppercase text-slate-500">{tr.settingsPassword.sectionTitle}</div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tr.settingsPassword.sectionHint}</p>

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="settings-new-password">
            {tr.settingsPassword.newPassword}
          </label>
          <input
            id="settings-new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-950 dark:text-white ${borderClass}`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="settings-new-password-2">
            {tr.settingsPassword.confirmPassword}
          </label>
          <input
            id="settings-new-password-2"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-950 dark:text-white ${borderClass}`}
          />
        </div>

        {state?.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
        ) : null}
        {state?.ok ? (
          <p className="text-sm text-green-700 dark:text-green-400">{tr.settingsPassword.success}</p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {pending ? tr.common.loading : tr.settingsPassword.submit}
        </button>
      </form>
    </div>
  );
}
