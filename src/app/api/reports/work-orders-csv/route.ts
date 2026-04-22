import { getTenantContext } from "@/lib/tenant/server";
import { getPool } from "@/lib/db/pool";
import { NextResponse } from "next/server";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query<{
    number: string;
    work_type: string;
    status: string;
    priority: string;
    created_at: string;
    fault_symptom: string | null;
  }>(
    `SELECT number, work_type, status, priority, created_at::text AS created_at, fault_symptom
     FROM work_orders
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 5000`,
    [ctx.tenantId],
  );

  const header = ["number", "work_type", "status", "priority", "created_at", "fault_symptom"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.number, r.work_type, r.status, r.priority, r.created_at, r.fault_symptom ?? ""]
        .map((c) => csvEscape(String(c)))
        .join(","),
    ),
  ];
  const body = lines.join("\r\n");
  const filename = `work-orders-${ctx.tenantId.slice(0, 8)}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
