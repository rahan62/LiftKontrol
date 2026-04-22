# Business rules (enforced in app + DB)

1. An elevator unit belongs to one site and one tenant (`elevator_assets.site_id`, `tenant_id`).
2. A site belongs to one customer and one tenant (`sites.customer_id`, `tenant_id`).
3. A maintenance visit can create repair recommendations (outcome flags + follow-up WO or child WO).
4. A repair can consume multiple parts (`stock_movements` / line items per WO).
5. A work order can involve multiple technicians (`work_order_assignments`).
6. A callback links to a previous work order (`work_orders.callback_of_id`, `callbacks` table).
7. Parts can be reserved before a visit and consumed during (`stock_reservations` → movements).
8. Job close respects tenant-configured checklist/signature rules (`tenant_settings` — implement in close action).
9. Unsafe units are flagged (`elevator_assets.unsafe_flag`, `work_orders.is_unsafe`) and block normal closure when configured.
10. Stock movement and WO consumption must stay consistent (transactional service layer).
11. Important records emit `domain_events` (and `audit_logs` on mutation).
12. Assembly projects may create new elevator assets on completion (`superseded_by_id` chain).
13. One customer → many buildings and many units.
14. One building → many elevator units.
15. Contracts encode recurrence and SLA expectations (`contracts` + `maintenance_plans`).
16. Customer requests become work orders after triage (`service_requests` → `work_orders`).
17. Technicians default to assigned-job visibility unless role grants broader access (enforce in queries + RLS policies as needed).

Edge cases (access denied, wrong part on van, mid-job reassignment, offline sync, expired contract + urgent repair, etc.) are handled via WO status, parts reservation release, `domain_events`, and explicit reason codes — extend `tenant_settings` for your workflows.
