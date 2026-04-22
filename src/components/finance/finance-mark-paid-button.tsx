"use client";

import { markFinanceEntryPaidAction } from "@/actions/finance";
import { tr } from "@/lib/i18n/tr";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  paid: boolean;
};

export function FinanceMarkPaidButton({ id, paid }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await markFinanceEntryPaidAction(id, !paid);
        setPending(false);
        if (!res.ok) {
          alert(res.error);
          return;
        }
        router.refresh();
      }}
      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900"
    >
      {paid ? tr.finances.markUnpaid : tr.common.markPaid}
    </button>
  );
}
