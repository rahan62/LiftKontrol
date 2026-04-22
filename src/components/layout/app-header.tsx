import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function AppHeader({ title, subtitle, actions }: Props) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-950">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Link
          href="/app/settings/users"
          className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          {tr.appHeader.users}
        </Link>
      </div>
    </header>
  );
}
