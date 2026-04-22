# API resources (illustrative)

Server Actions and Route Handlers under `src/app/api/*` (add as needed). Bodies are JSON; all tenant-scoped rows require `tenant_id` resolved from `tenant_members`.

| Method | Resource | Notes |
|--------|----------|--------|
| GET/POST | `/api/tenants/current` | Current tenant + settings |
| GET/PATCH | `/api/customers` | CRM |
| GET/PATCH | `/api/customers/:id` | Detail + tabs |
| GET/POST | `/api/sites` | Buildings |
| GET/PATCH | `/api/elevator-assets` | Unit hub |
| GET/PATCH | `/api/work-orders` | Field service |
| POST | `/api/work-orders/:id/assign` | Assignments |
| POST | `/api/work-orders/:id/close` | Close rules + events |
| POST | `/api/stock/reservations` | Reserve for WO |
| POST | `/api/stock/movements` | Issue, transfer, adjust (idempotency key) |
| POST | `/api/domain-events` | Generic timeline append |

Request/response examples should mirror Zod schemas (recommended follow-up) aligned with `supabase/migrations/*.sql` columns.
