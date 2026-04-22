# Phase 2: Data Model

## Entity catalog

### Multi-tenant / company

| Entity | Key attributes | Relations |
|--------|----------------|-----------|
| `tenants` | id, name, slug, branding (jsonb), subscription (jsonb), created_at | root |
| `tenant_settings` | tenant_id, key, value (jsonb) | 1:N tenants |
| `numbering_sequences` | tenant_id, entity_key, prefix, next_value, padding | tenants |
| `custom_field_definitions` | tenant_id, entity_type, key, label, field_type, validation (jsonb), sort_order | tenants |
| `custom_field_values` | tenant_id, definition_id, entity_type, entity_id, value (jsonb) | polymorphic |

### Users and access

| Entity | Key attributes | Relations |
|--------|----------------|-----------|
| `profiles` | id (= auth.users), email, full_name, phone, avatar_url | auth |
| `tenant_members` | tenant_id, user_id, system_role, is_active, joined_at | tenants, profiles |
| `role_permission_overrides` | optional per-member jsonb for edge cases | tenant_members |

**Suggested `system_role` enum:** `super_admin` (platform), `tenant_owner`, `company_admin`, `dispatcher`, `service_manager`, `technician`, `warehouse_manager`, `finance`, `sales_quotation`, `customer_support_readonly`, `customer_portal_user`.

**Granular permissions** (stored as keys, resolved in app + optional table `tenant_role_permissions`):  
`customers.read`, `customers.write`, `sites.read`, `sites.write`, `assets.read`, `assets.write`, `work_orders.read`, `work_orders.write`, `work_orders.assign`, `work_orders.close`, `work_orders.view_costs`, `stock.read`, `stock.write`, `stock.consume`, `stock.view_costs`, `contracts.read`, `contracts.write`, `projects.read`, `projects.write`, `quotations.read`, `quotations.write`, `quotations.approve`, `reports.read`, `reports.export`, `settings.tenant`, `users.manage`, `attachments.delete`, `financials.view`, …

### Customers and locations

| Entity | Attributes (summary) |
|--------|----------------------|
| `customers` | code, legal_name, billing_address (jsonb), tax_id, status, portal_enabled |
| `customer_contacts` | customer_id, name, role, email, phone, is_primary, is_emergency |
| `sites` | customer_id, name, service_address (jsonb), billing_same_as_service, access_instructions, machine_room_notes, shaft_notes |

### Elevator assets

| Entity | Attributes (summary) |
|--------|----------------------|
| `elevator_assets` | unit_code, customer_id, site_id, type (enum), brand, model, serial_number, controller_type, drive_type, door_type, stops, capacity_kg, persons, speed, commissioned_at, takeover_at, contract_status, warranty (jsonb), operational_status, unsafe_flag, risk_flags (jsonb), tags (text[]), superseded_by_id (history chain) |
| `elevator_components` | asset_id, name, part_number_ref, notes, replacement_recommended |

**Operational / work enums (suggested):**  
- Asset type: `passenger`, `freight`, `hospital`, `panoramic`, `dumbwaiter`, `platform`, `hydraulic`, `traction`, `mrl`, `other`.  
- Operational status: `in_service`, `limited`, `out_of_service`, `unsafe`, `decommissioned`.

### Contracts

| Entity | Attributes |
|--------|------------|
| `contracts` | type, customer_id, site_id(s), asset_id(s) or link table, start_at, end_at, renewal_terms (jsonb), recurring_price, scope_in (jsonb), scope_out (jsonb), response_sla_minutes, callback_terms (jsonb), overtime_terms (jsonb), parts_coverage (jsonb), invoicing_rules (jsonb) |

Contract types: `monthly_maintenance`, `periodic_custom`, `repair_agreement`, `installation`, `modernization`, `warranty_support`, `other`.

### Work management

| Entity | Attributes |
|--------|------------|
| `service_requests` | intake channel, customer_id, site_id, asset_id?, description, priority, status, triaged_to_work_order_id |
| `work_orders` | number, type, priority, status, source, customer_id, site_id, elevator_asset_id?, project_id?, contract_id?, parent_id?, callback_of_id?, planned window, actuals, labor/travel, fault fields, downtime, notes (internal/external), flags (emergency, unsafe), outcome, follow-up, checklist jsonb, closure metadata |
| `work_order_assignments` | work_order_id, user_id, role (`lead`, `assistant`, …), assigned_at, unassigned_at |
| `work_order_parts` | work_order_id, stock_item_id, qty_reserved, qty_consumed, from_location_id, movement_ids[] |

Work order types: as specified (maintenance, emergency, planned repair, callback, inspection, modernization, assembly, survey, quotation visit, stock delivery, complaint, lockout, return visit, preventive replacement).

### Projects (assembly / installation)

| Entity | Attributes |
|--------|------------|
| `projects` | name, type, customer_id, site_id, status, planned/actual dates, cost snapshot (jsonb) |
| `project_milestones` | project_id, name, due_at, done_at, order_index |
| `project_tasks` | project_id, title, assignee, status, blocker flag |

### Stock

| Entity | Attributes |
|--------|------------|
| `stock_locations` | type (`warehouse`, `van`, `site_reserve`, `quarantine`, …), ref (e.g. vehicle_id), site_id? |
| `stock_items` | sku, description, uom, serial_tracked, batch_tracked, min/max, preferred_vendor_id, lead_time_days, substitutes (jsonb), compat (jsonb) |
| `stock_balances` | item_id, location_id, qty_on_hand, qty_reserved |
| `stock_movements` | type, item_id, qty, serials (jsonb), from_loc, to_loc, work_order_id?, project_id?, unit_cost |
| `stock_reservations` | item_id, location_id, work_order_id, qty, status |

### Quotations

| Entity | Attributes |
|--------|------------|
| `quotations` | number, customer_id, work_order_id?, status, valid_until, totals (jsonb), approval trail (jsonb) |
| `quotation_line_items` | quotation_id, kind (`labor`, `part`, `other`), description, qty, unit_price |

### Callbacks

| Entity | Attributes |
|--------|------------|
| `callbacks` | tenant_id, prior_work_order_id, new_work_order_id, related_asset_id, similarity_score?, reason_code, analysis (jsonb) |

### Universal event log & audit

| Entity | Attributes |
|--------|------------|
| `domain_events` | event_type, actor_type (`user`, `system`, `customer`, `integration`), actor_id, object_type, object_id, visibility, payload (jsonb), note, created_at |
| `audit_logs` | table_name, record_id, action, actor_id, old_values (jsonb), new_values (jsonb), tenant_id |
| `attachments` | storage_path, filename, mime, size, linked_entity_type, linked_entity_id, uploaded_by |

### Maintenance scheduling

| Entity | Attributes |
|--------|------------|
| `maintenance_plans` | asset_id or contract_id, template_id, recurrence_rule (jsonb), next_run_at |
| `maintenance_templates` | checklist schema (jsonb), required_readings, applicable types |
| `maintenance_schedule_instances` | plan_id, due_at, generated_work_order_id, status (`due`, `done`, `skipped`, `missed`) |

## Relations (constraints)

1. `elevator_assets.tenant_id` = `sites.tenant_id` = `customers.tenant_id`.
2. `sites.customer_id` required; assets belong to one site and one tenant.
3. `work_orders` optionally link `callback_of_id` → prior WO; `parent_id` for child visits.
4. `stock_movements` must reconcile `stock_balances`; reservations release on cancel.
5. `domain_events` are append-only; feed UI timelines by `object_type` + `object_id`.

## Status suggestions (per entity)

- **Work order:** `draft`, `triaged`, `scheduled`, `dispatched`, `en_route`, `on_site`, `paused`, `awaiting_parts`, `awaiting_quote`, `awaiting_signature`, `completed`, `cancelled`, `closed`.
- **Maintenance instance:** `scheduled`, `due`, `completed`, `skipped`, `missed`.
- **Project:** `planning`, `in_progress`, `on_hold`, `commissioning`, `completed`, `cancelled`.
- **Quotation:** `draft`, `sent`, `approved`, `partially_approved`, `rejected`, `expired`, `converted`.
- **Contract:** `draft`, `active`, `suspended`, `expired`, `renewed`.
- **Reservation:** `active`, `fulfilled`, `released`, `expired`.

## Derived / analytical views (reporting)

Materialized or SQL views: maintenance backlog, callback KPIs, first-time fix, technician utilization, stock aging, SLA breach risk, chronic assets.
