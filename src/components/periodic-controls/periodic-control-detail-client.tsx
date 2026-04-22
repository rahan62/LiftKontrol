"use client";

import { CreateRevisionModal } from "@/components/periodic-controls/create-revision-modal";
import type { RevisionArticleRow } from "@/lib/data/revision-articles";
import { tr } from "@/lib/i18n/tr";
import { btnPrimary } from "@/components/forms/field-classes";
import { useState } from "react";

type Props = {
  periodicControlId: string;
  articles: RevisionArticleRow[];
};

export function PeriodicControlDetailClient({ periodicControlId, articles }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
        {tr.periodicControls.createRevision}
      </button>
      <CreateRevisionModal
        open={open}
        periodicControlId={periodicControlId}
        articles={articles}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
