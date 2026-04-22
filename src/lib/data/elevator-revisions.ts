import { getPool } from "@/lib/db/pool";

export type ElevatorRevisionListRow = {
  id: string;
  elevator_asset_id: string;
  unit_code: string;
  site_name: string | null;
  periodic_control_id: string | null;
  total_fee_try: string;
  approval_status: string;
  final_ticket: string | null;
  created_at: string;
};

export async function listElevatorRevisions(tenantId: string): Promise<ElevatorRevisionListRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ElevatorRevisionListRow>(
    `SELECT er.id,
            er.elevator_asset_id,
            ea.unit_code,
            s.name AS site_name,
            er.periodic_control_id,
            er.total_fee_try::text AS total_fee_try,
            er.approval_status,
            er.final_ticket,
            er.created_at::text AS created_at
     FROM elevator_revisions er
     INNER JOIN elevator_assets ea ON ea.id = er.elevator_asset_id AND ea.tenant_id = er.tenant_id
     LEFT JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     WHERE er.tenant_id = $1
     ORDER BY er.created_at DESC`,
    [tenantId],
  );
  return rows;
}

export type RevisionLineDetail = {
  id: string;
  revision_article_id: string;
  article_code: string;
  title: string;
  description: string | null;
  ticket_tier: string;
  unit_price_try: string;
  sort_order: number;
};

export type ElevatorRevisionDetail = {
  id: string;
  elevator_asset_id: string;
  unit_code: string;
  site_name: string | null;
  customer_name: string | null;
  periodic_control_id: string | null;
  total_fee_try: string;
  offer_pdf_path: string | null;
  notes: string | null;
  created_at: string;
  approval_status: string;
  approved_at: string | null;
  agreed_target_ticket: string | null;
  contract_signed_at: string | null;
  purchasing_completed_at: string | null;
  work_started_at: string | null;
  scheduled_work_at: string | null;
  work_completed_at: string | null;
  deadline_at: string | null;
  second_control_report_path: string | null;
  needs_rework: boolean;
  final_inspection_at: string | null;
  final_ticket: string | null;
  final_fulfilled_article_ids: string[];
  lines: RevisionLineDetail[];
};

export async function getElevatorRevision(tenantId: string, id: string): Promise<ElevatorRevisionDetail | null> {
  const pool = getPool();
  const { rows: head } = await pool.query(
    `SELECT er.id,
            er.elevator_asset_id,
            ea.unit_code,
            s.name AS site_name,
            c.legal_name AS customer_name,
            er.periodic_control_id,
            er.total_fee_try::text AS total_fee_try,
            er.offer_pdf_path,
            er.notes,
            er.created_at::text AS created_at,
            er.approval_status,
            er.approved_at::text AS approved_at,
            er.agreed_target_ticket,
            er.contract_signed_at::text AS contract_signed_at,
            er.purchasing_completed_at::text AS purchasing_completed_at,
            er.work_started_at::text AS work_started_at,
            er.scheduled_work_at::text AS scheduled_work_at,
            er.work_completed_at::text AS work_completed_at,
            er.deadline_at::text AS deadline_at,
            er.second_control_report_path,
            COALESCE(er.needs_rework, false) AS needs_rework,
            er.final_inspection_at::text AS final_inspection_at,
            er.final_ticket,
            er.final_fulfilled_article_ids
     FROM elevator_revisions er
     INNER JOIN elevator_assets ea ON ea.id = er.elevator_asset_id AND ea.tenant_id = er.tenant_id
     LEFT JOIN sites s ON s.id = ea.site_id AND s.tenant_id = ea.tenant_id
     INNER JOIN customers c ON c.id = ea.customer_id AND c.tenant_id = ea.tenant_id
     WHERE er.tenant_id = $1 AND er.id = $2`,
    [tenantId, id],
  );
  const h = head[0] as Record<string, unknown> | undefined;
  if (!h) return null;

  const { rows: lines } = await pool.query<RevisionLineDetail>(
    `SELECT erl.id,
            erl.revision_article_id::text AS revision_article_id,
            ra.article_code,
            ra.title,
            ra.description,
            ra.ticket_tier,
            erl.unit_price_try::text AS unit_price_try,
            erl.sort_order
     FROM elevator_revision_lines erl
     INNER JOIN revision_articles ra ON ra.id = erl.revision_article_id AND ra.tenant_id = erl.tenant_id
     WHERE erl.tenant_id = $1 AND erl.revision_id = $2
     ORDER BY erl.sort_order ASC, ra.article_code ASC`,
    [tenantId, id],
  );

  const fulfilledRaw = h.final_fulfilled_article_ids;
  const fulfilled: string[] = Array.isArray(fulfilledRaw)
    ? (fulfilledRaw as unknown[]).map((x) => String(x))
    : [];

  return {
    id: String(h.id),
    elevator_asset_id: String(h.elevator_asset_id),
    unit_code: String(h.unit_code),
    site_name: h.site_name != null ? String(h.site_name) : null,
    customer_name: h.customer_name != null ? String(h.customer_name) : null,
    periodic_control_id: h.periodic_control_id != null ? String(h.periodic_control_id) : null,
    total_fee_try: String(h.total_fee_try),
    offer_pdf_path: h.offer_pdf_path != null ? String(h.offer_pdf_path) : null,
    notes: h.notes != null ? String(h.notes) : null,
    created_at: String(h.created_at),
    approval_status: String(h.approval_status ?? "pending"),
    approved_at: h.approved_at != null ? String(h.approved_at) : null,
    agreed_target_ticket: h.agreed_target_ticket != null ? String(h.agreed_target_ticket) : null,
    contract_signed_at: h.contract_signed_at != null ? String(h.contract_signed_at) : null,
    purchasing_completed_at: h.purchasing_completed_at != null ? String(h.purchasing_completed_at) : null,
    work_started_at: h.work_started_at != null ? String(h.work_started_at) : null,
    scheduled_work_at: h.scheduled_work_at != null ? String(h.scheduled_work_at).slice(0, 10) : null,
    work_completed_at: h.work_completed_at != null ? String(h.work_completed_at) : null,
    deadline_at: h.deadline_at != null ? String(h.deadline_at).slice(0, 10) : null,
    second_control_report_path: h.second_control_report_path != null ? String(h.second_control_report_path) : null,
    needs_rework: Boolean(h.needs_rework),
    final_inspection_at: h.final_inspection_at != null ? String(h.final_inspection_at) : null,
    final_ticket: h.final_ticket != null ? String(h.final_ticket) : null,
    final_fulfilled_article_ids: fulfilled,
    lines,
  };
}
