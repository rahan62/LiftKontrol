import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Liste / modül başlığında küçük vurgulu ikon. */
  titleIcon?: LucideIcon;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DataTableShell({ title, titleIcon: TitleIcon, description, actions, children }: Props) {
  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-white via-teal-50/40 to-white px-4 py-4 dark:border-slate-800 dark:from-slate-950 dark:via-teal-950/15 dark:to-slate-950 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {TitleIcon ? (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600/90 text-white shadow-sm dark:bg-teal-700">
                <TitleIcon className="h-5 w-5 opacity-95" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 border-l-[3px] border-teal-600 pl-3 dark:border-teal-500">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
      </div>
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">{children}</div>
      </div>
    </div>
  );
}
