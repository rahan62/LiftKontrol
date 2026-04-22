# Phase 4: Technical Design

## Stack (code-facing)

- **Next.js** (App Router) + **React** + **Tailwind CSS**
- **Supabase:** Postgres, Auth (email), Row Level Security, Storage (attachments)
- **Deployment target:** Vercel (user-provided infra details apply to env only)

## Bounded contexts

| Context | Responsibility |
|---------|----------------|
| Identity & tenancy | Auth users, profiles, tenant membership, role resolution |
| CRM | Customers, sites, contacts, intake |
| Assets | Elevator units, components, operational state |
| Contracts | Commercial terms, SLA hooks |
| Field service | Work orders, assignments, field state machine |
| Maintenance | Plans, recurrence, generated instances |
| Projects | Install/mod milestones |
| Inventory | Items, locations, balances, movements, reservations |
| Quotations | Quotes, lines, approvals |
| Reporting | Views, KPI queries, exports |
| Audit & events | `audit_logs`, `domain_events`, attachments metadata |

## API surface (Next.js)

- **Server Actions** + **Route Handlers** under `src/app/api/**` for webhooks and integrations.
- **REST-style resource list** (illustrative):

```
GET/POST   /api/tenants/current
GET/PATCH  /api/customers
GET/PATCH  /api/customers/:id
GET/POST   /api/sites
GET/PATCH  /api/elevator-assets
GET/PATCH  /api/work-orders
POST       /api/work-orders/:id/assign
POST       /api/work-orders/:id/close
POST       /api/stock/reservations
POST       /api/stock/movements
POST       /api/domain-events
```

Request/response bodies use shared Zod schemas (recommended next step) + TypeScript types in `src/domain`.

## Service layer boundaries

- `services/tenancy` — resolve `tenant_id` from session; guard RPCs.
- `services/workOrders` — state transitions, close rules, event emission.
- `services/stock` — reservation/consume in one transaction.
- `services/events` — append `domain_events` + project to timelines.

## Database

- Single Postgres schema (`public`) with `tenant_id` on all tenant-scoped tables.
- RLS policies: membership subquery on `tenant_members`.
- Indexes: `(tenant_id, status)`, `(tenant_id, updated_at DESC)`, GIN for tags/jsonb where needed.

## Background jobs (queue — implementation TBD)

| Job | Cadence | Purpose |
|-----|---------|---------|
| `generate_maintenance_work_orders` | Daily/hourly | Create WO from due instances |
| `low_stock_scan` | Daily | Alerts + events |
| `sla_watch` | Every N minutes | SLA risk notifications |
| `overdue_maintenance_digest` | Daily | Dispatcher dashboard feed |
| `report_snapshots` | Configurable | KPI materialization |

**Implementation options:** Vercel Cron → Route Handler, Supabase `pg_cron`, or external worker. Codebase exposes service functions callable from any scheduler.

## Integration points

- **Email:** Supabase Auth + transactional email provider (configurable).
- **Maps / routing:** Store geo on `sites`; integrate Mapbox/Google later.
- **Accounting:** Export invoices; webhook placeholders.
- **Barcode/QR:** Asset `unit_code` + URL pattern for mobile scan routes.

## Extensibility

- `custom_field_definitions` + `custom_field_values` for tenant-defined fields.
- `domain_events` for unstructured operational facts without schema migrations.
- `tenant_settings` JSON for close rules, numbering, feature flags.

## Idempotency

- Stock movements: `idempotency_key` (uuid) optional column to prevent duplicate posts from flaky mobile clients.
- WO generation from maintenance instance: unique `(schedule_instance_id)` on `work_orders`.

## Validation rules (central)

Implemented in server actions: referential integrity (asset belongs to site’s customer), contract window, role permissions, stock non-negative, event payload size limits.
