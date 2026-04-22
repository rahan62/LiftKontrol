import { getPool } from "@/lib/db/pool";

export type RevisionArticleRow = {
  id: string;
  sort_order: number;
  article_code: string;
  title: string;
  description: string | null;
  default_cost_try: string | null;
  ticket_tier: string;
};

export async function listRevisionArticles(tenantId: string): Promise<RevisionArticleRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<RevisionArticleRow>(
    `SELECT id, sort_order, article_code, title, description, default_cost_try::text AS default_cost_try,
            ticket_tier
     FROM revision_articles
     WHERE tenant_id = $1
     ORDER BY sort_order ASC, article_code ASC`,
    [tenantId],
  );
  return rows;
}
