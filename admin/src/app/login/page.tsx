import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-white">Lift Kontrol — Platform</h1>
        <p className="mt-1 text-sm text-slate-500">Yalnızca yetkili operatör hesapları</p>
        <Suspense fallback={<p className="mt-8 text-sm text-slate-500">Yükleniyor…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
