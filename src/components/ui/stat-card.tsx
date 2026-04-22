import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  variant?: "default" | "warning" | "danger";
};

export function StatCard({ label, value, hint, variant = "default" }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950",
        variant === "warning" && "border-amber-300/80 dark:border-amber-700",
        variant === "danger" && "border-rose-300/80 dark:border-rose-800",
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
