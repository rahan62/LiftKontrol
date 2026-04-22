# Phase 1: Product and Domain Analysis

## Business model (elevator service companies)

Independent elevator **service** organizations maintain revenue through **recurring maintenance contracts**, **time-and-materials repairs**, **SLA-driven emergency response**, **installation/assembly projects**, and **modernization** engagements. They do not manufacture equipment; their inventory is **purchased spare parts and consumables**, and their asset is **technician time and knowledge**.

### Core value streams

1. **Contracted maintenance** — Predictable visits (often monthly) with checklists, readings, and compliance documentation; missed visits erode trust and create liability.
2. **Reactive service** — Breakdowns and complaints; speed, first-time fix, and callback avoidance define profitability and reputation.
3. **Projects** — Installations and modernizations are milestone-driven, material-dependent, and handover-sensitive.
4. **Parts and logistics** — Van stock, warehouse, reservations, and returns must tie to jobs without breaking inventory truth.

### Main workflows

| Workflow | Actors | Outcome |
|----------|--------|---------|
| Contract setup → schedule | Sales, admin | SLA rules, recurrence, billing hooks |
| Schedule → dispatch | Dispatcher | Assigned techs, windows, priorities |
| Field execution | Technician | Checklists, faults, parts, media, signatures |
| Triage → work order | Dispatcher / CRM | Request becomes typed work with correct asset |
| Repair → quote → approval | Tech, sales, customer | Commercial path before major work |
| Callback detection | System / supervisor | Link repeat issues to prior jobs |
| Stock reservation → consumption | Warehouse, tech | Movements consistent with WO closure |
| Project lifecycle | PM, site teams | Milestones, snags, commissioning |

### Pain points (operational reality)

- **Fragmented history** — Asset truth scattered across paper, WhatsApp, and spreadsheets.
- **Dispatch blind spots** — SLA and emergency visibility without map-ready data later.
- **Callback ambiguity** — “Same fault” not tied to root cause or part quality.
- **Inventory drift** — Van vs warehouse discrepancies and unused reservations.
- **Compliance evidence** — Signatures, readings, and unsafe states not auditable.

### KPIs (module-aligned)

- Units under maintenance; overdue maintenance rate; maintenance completion rate.
- Mean time to respond / resolve; first-time fix rate; callback rate; repeat fault rate.
- Downtime by unit, site, customer; unsafe shutdown count.
- Technician productivity (jobs, hours); SLA breach count.
- Stock turnover, low-stock exposure; dead stock identification.
- Quotation pipeline; jobs blocked on approval.

### Required modules (product map)

1. Dashboards (role-specific)
2. CRM (customers, sites, contacts, intake, documents)
3. Elevator assets (unit-centric hub)
4. Maintenance (plans, recurrence, WO generation, outcomes)
5. Repairs / breakdowns / callbacks
6. Assembly / projects
7. Stock / inventory / van / reservations
8. Scheduling & dispatch
9. Field / mobile workflow
10. Quotations & commercial follow-up
11. Reporting & KPIs
12. Users, roles, settings, custom fields, numbering, audit & universal events

---

## Design principles

- **Tenant isolation** is non-negotiable; every business row carries `tenant_id`.
- **Elevator unit** is the long-lived anchor; jobs and parts roll up to it.
- **Structured workflows** (WO types, statuses) coexist with a **domain event log** for anything else.
- **Close rules** are tenant-configurable (checklists, signatures, unsafe blocks).
- **Technician visibility** defaults to assigned work unless role grants broader access.
