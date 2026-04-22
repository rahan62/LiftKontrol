# Phase 3: Functional Specification

## Global UX

- Dense enterprise tables with sticky headers, column visibility, saved filters (tenant-level).
- Global search across customers, sites, unit codes, WO numbers (implementation: Postgres `tsvector` or external search later).
- Timeline component on every major detail screen sourcing `domain_events` + key milestones.
- Quick actions: new WO from asset, reserve parts, add callback link, escalate.
- Badges: overdue, unsafe, emergency, SLA risk, callback.

## Navigation (mapped to routes)

| Module | List | Detail | Notes |
|--------|------|--------|-------|
| Dashboard | `/` | — | Role-based widgets |
| Customers | `/customers` | `/customers/[id]` | Tabs: overview, sites, contracts, assets, WO, invoices summary, timeline |
| Sites | `/sites` | `/sites/[id]` | Access, contacts map, units |
| Elevators | `/assets` | `/assets/[id]` | Heart of product |
| Contracts | `/contracts` | `/contracts/[id]` | SLA, renewal, documents |
| Maintenance | `/maintenance` | `/maintenance/[id]` | Plans, instances |
| Repairs | `/work-orders` (filter type) | `/work-orders/[id]` | Breakdown focus |
| Callbacks | `/callbacks` | links to WO | Repeat fault analytics |
| Projects | `/projects` | `/projects/[id]` | Milestones, materials, labor |
| Schedule | `/schedule` | — | Calendar + kanban placeholders |
| Stock | `/stock` | `/stock/items/[id]` | Movements, balances |
| Quotations | `/quotations` | `/quotations/[id]` | Approval flow |
| Reports | `/reports` | — | Filterable KPIs |
| Documents | `/documents` | — | Cross-entity library or deep links |
| Users | `/settings/users` | — | Invites, roles |
| Settings | `/settings` | — | Branding, numbering, custom fields, WO close rules |

## Page feature lists (abbreviated)

### Dashboards

- **Admin:** counts, maintenance due buckets, open breakdowns/callbacks, projects, utilization snapshot, stock alerts, warranty expiry, SLA risk, downtime & repeat fault summaries.
- **Dispatcher:** inbound requests, unassigned, today plan, emergencies, tech on job, overdue, callback alerts.
- **Technician:** today’s jobs, checklists pending, parts required, van stock snapshot, signature pending, follow-ups.
- **Warehouse:** low stock, reservations, PO needs placeholder, movements, dead stock report placeholder.

### CRM

- CRUD customers, sites, contacts; service request intake; complaint log; document upload; communication log via `domain_events`.

### Asset page

- Summary, technical specs, status, contract snippet, last/next maintenance, open faults, downtime, WO list, callback rate, parts history, attachments, inspections, unified timeline.

### Maintenance

- Templates, recurrence, auto-WO generation job, due/overdue/skip reasons, checklist execution, readings, outcomes (all paths from spec), signature, PDF report readiness.

### Repairs / callbacks

- Severity, safety class, downtime, root cause, temp vs permanent fix, escalation, media, callback linking, chronic analysis views.

### Stock

- Multi-location balances, reservation lifecycle, consume from van with WO + movement + event consistency.

## Permissions (examples)

| Action | Typical roles |
|--------|----------------|
| View all customers | Admin, dispatcher, service manager, finance (read), support |
| Create WO | Dispatcher, service manager, CRM |
| Assign technicians | Dispatcher, service manager |
| Close WO | Service manager, lead tech (if policy) |
| Consume parts | Technician, warehouse |
| View unit cost / margin | Finance, owner (config) |
| Approve quotation | Sales, owner, customer (portal) |
| Manage tenant settings | Owner, company admin |

## Validations

- WO close: mandatory checklist items satisfied; signature if configured; unsafe closure blocked unless `unsafe_override` role + reason.
- Asset: unit_code unique per tenant per site (or per tenant — tenant setting).
- Stock: cannot consume below available − reservations; serial-tracked items require serial list.
- Contract dates must encompass linked schedule generation window where applicable.

## Notifications (event-driven)

- SLA breach risk (before breach), overdue maintenance, low stock, quote approved/rejected, assignment, customer request created, unsafe flagged.

Channels: in-app (`domain_events` + notification table future), email (Supabase hooks / Edge Functions — infra separate).
