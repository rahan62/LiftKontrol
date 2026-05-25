import { RevisionArticlesClient } from "@/components/revision-articles/revision-articles-client";
import { DataTableShell } from "@/components/module/data-table-shell";
import { listRevisionArticles } from "@/lib/data/revision-articles";
import { tr } from "@/lib/i18n/tr";
import { getTenantContext } from "@/lib/tenant/server";
import { BookMarked } from "lucide-react";
import { redirect } from "next/navigation";

export default async function RevisionArticlesPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const rows = await listRevisionArticles(ctx.tenantId);

  return (
    <DataTableShell
      titleIcon={BookMarked}
      title={tr.en8120.revisionArticles}
      description={tr.en8120.revisionArticlesHint}
    >
      <RevisionArticlesClient initialRows={rows} />
    </DataTableShell>
  );
}
