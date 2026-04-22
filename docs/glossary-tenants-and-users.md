# Tenants vs CRM customers vs users

## Tenant (service company)

In this product, a **tenant** is **one elevator service company** that buys your software — the maintenance / repair / installation **contractor**, not the building owner.

- One row in `tenants` = one sold customer of yours (e.g. “Acme Elevator Services”).
- All operational data (sites, elevator units under contract, work orders, stock, employees) is scoped with `tenant_id` so each **service company’s** data stays isolated.
- In the UI we say **company** or **organization** where it helps; **tenant** is the technical term in the database and code.

## CRM “customers” (building owners / accounts)

The **customers** module is for **your tenant’s clients**: property managers, facility owners, etc. They are **not** users of this SaaS unless you later add a separate **customer portal**. They are data records (accounts, contacts, contracts), not product tenants.

## Who signs in

Only **employees and admins of the elevator company** use the app. There is **no public self-registration** for new companies:

1. You **provision** a new company (tenant) and the first **company admin** when you sell the product (manual / internal process, Supabase Auth user + `tenant_members` row).
2. That admin **invites or creates** additional users **only inside their own company** (collaborators: technicians, dispatchers, etc.).

## Collaborators

Users with access are linked via `tenant_members` to exactly one (or in rare cases future multi-org setups, more than one) tenant. Roles distinguish owner, admin, technician, dispatcher, warehouse, and so on.
