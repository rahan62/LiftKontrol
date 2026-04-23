"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    errParam === "forbidden" ? "Bu hesap platform yönetimine yetkili değil." : null,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      setError(signErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setError("Oturum alınamadı.");
      return;
    }

    const { data: op } = await supabase
      .from("platform_operators")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!op) {
      await supabase.auth.signOut();
      setError("Bu hesap platform yönetimine yetkili değil.");
      return;
    }

    router.push("/tenants");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 flex flex-col gap-4">
      {error ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="text-xs font-medium text-slate-400">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-xs font-medium text-slate-400">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
        />
      </div>
      <button
        type="submit"
        className="mt-2 rounded-md bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        Giriş
      </button>
    </form>
  );
}
