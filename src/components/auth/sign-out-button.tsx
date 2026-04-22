"use client";

import { signOutClient } from "@/lib/auth/sign-out-client";
import { tr } from "@/lib/i18n/tr";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="touch-manipulation min-h-11 shrink-0 cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:min-h-0 sm:px-2 sm:py-1 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
      onClick={async () => {
        await signOutClient();
        router.push("/login");
        router.refresh();
      }}
    >
      {tr.auth.signOut}
    </button>
  );
}
