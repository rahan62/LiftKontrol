-- Elevator Field Service — initial schema (multi-tenant)
-- Apply via Supabase SQL editor or CLI: supabase db push

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helper: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- -----------------------------------------------------------------------------
-- Tenancy
-- -----------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  branding jsonb not null default '{}'::jsonb,
  subscription jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create table public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create trigger tenant_settings_updated_at
before update on public.tenant_settings
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profiles (1:1 auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Membership & RBAC (role as enum text; granular keys resolved in app)
-- -----------------------------------------------------------------------------
create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  system_role text not null check (system_role in (
    'tenant_owner', 'company_admin', 'dispatcher', 'service_manager',
    'technician', 'warehouse_manager', 'finance', 'sales_quotation',
    'customer_support_readonly', 'customer_portal_user'
  )),
  is_active boolean not null default true,
  permission_overrides jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_members_user_idx on public.tenant_members (user_id);

-- -----------------------------------------------------------------------------
-- Numbering & custom fields
-- -----------------------------------------------------------------------------
create table public.numbering_sequences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_key text not null,
  prefix text not null default '',
  next_value bigint not null default 1,
  padding int not null default 5,
  unique (tenant_id, entity_key)
);

create table public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null,
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'boolean', 'date', 'select', 'multiselect', 'json')),
  options jsonb,
  validation jsonb,
  sort_order int not null default 0,
  unique (tenant_id, entity_type, field_key)
);

create table public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  value jsonb not null,
  unique (definition_id, entity_id)
);

-- -----------------------------------------------------------------------------
-- CRM
-- -----------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text,
  legal_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  billing_address jsonb,
  tax_id text,
  portal_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_tenant_idx on public.customers (tenant_id);
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  is_emergency boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_contacts_customer_idx on public.customer_contacts (customer_id);
create trigger customer_contacts_updated_at before update on public.customer_contacts
for each row execute function public.set_updated_at();

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  service_address jsonb not null default '{}'::jsonb,
  billing_same_as_service boolean not null default true,
  access_instructions text,
  machine_room_notes text,
  shaft_notes text,
  emergency_phones text,
  geo jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_tenant_customer_idx on public.sites (tenant_id, customer_id);
create trigger sites_updated_at before update on public.sites
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Elevator assets
-- -----------------------------------------------------------------------------
create table public.elevator_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  unit_code text not null,
  elevator_type text not null default 'other',
  brand text,
  model text,
  serial_number text,
  controller_type text,
  drive_type text,
  door_type text,
  stops int,
  capacity_kg numeric,
  persons int,
  speed numeric,
  commissioned_at date,
  takeover_at date,
  contract_status text,
  warranty jsonb,
  operational_status text not null default 'in_service',
  unsafe_flag boolean not null default false,
  risk_flags jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  superseded_by_id uuid references public.elevator_assets(id),
  qr_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, site_id, unit_code)
);

create index elevator_assets_site_idx on public.elevator_assets (site_id);
create index elevator_assets_tenant_idx on public.elevator_assets (tenant_id);
create trigger elevator_assets_updated_at before update on public.elevator_assets
for each row execute function public.set_updated_at();

create table public.elevator_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  name text not null,
  part_number_ref text,
  notes text,
  replacement_recommended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger elevator_components_updated_at before update on public.elevator_components
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Contracts
-- -----------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  contract_type text not null,
  status text not null default 'draft',
  title text not null,
  start_at date not null,
  end_at date,
  renewal_terms jsonb,
  recurring_price numeric,
  scope_in jsonb,
  scope_out jsonb,
  response_sla_minutes int,
  callback_terms jsonb,
  overtime_terms jsonb,
  parts_coverage jsonb,
  invoicing_rules jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_customer_idx on public.contracts (customer_id);
create trigger contracts_updated_at before update on public.contracts
for each row execute function public.set_updated_at();

create table public.contract_assets (
  contract_id uuid not null references public.contracts(id) on delete cascade,
  asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  primary key (contract_id, asset_id)
);

-- -----------------------------------------------------------------------------
-- Service requests & work orders
-- -----------------------------------------------------------------------------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  asset_id uuid references public.elevator_assets(id) on delete set null,
  channel text not null default 'phone',
  description text not null,
  priority text not null default 'normal',
  status text not null default 'open',
  triaged_work_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_requests_updated_at before update on public.service_requests
for each row execute function public.set_updated_at();

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number text not null,
  work_type text not null,
  priority text not null default 'normal',
  status text not null default 'draft',
  source text not null default 'internal',
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  elevator_asset_id uuid references public.elevator_assets(id) on delete set null,
  project_id uuid,
  contract_id uuid references public.contracts(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  parent_work_order_id uuid references public.work_orders(id) on delete set null,
  callback_of_id uuid references public.work_orders(id) on delete set null,
  requested_by_contact_id uuid references public.customer_contacts(id) on delete set null,
  fault_symptom text,
  fault_root_cause text,
  severity text,
  safety_risk text,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  travel_minutes int,
  labor_minutes int,
  downtime_start timestamptz,
  downtime_end timestamptz,
  service_result text,
  outcome_flags jsonb not null default '{}'::jsonb,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  internal_notes text,
  customer_visible_notes text,
  is_emergency boolean not null default false,
  is_unsafe boolean not null default false,
  checklist jsonb,
  quotation_id uuid,
  idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create index work_orders_tenant_status_idx on public.work_orders (tenant_id, status);
create index work_orders_asset_idx on public.work_orders (elevator_asset_id);
create trigger work_orders_updated_at before update on public.work_orders
for each row execute function public.set_updated_at();

create table public.work_order_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'lead',
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz
);

create index work_order_assignments_wo_idx on public.work_order_assignments (work_order_id);

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  name text not null,
  project_type text not null,
  status text not null default 'planning',
  planned_start date,
  planned_end date,
  actual_end date,
  cost_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

alter table public.work_orders
  add constraint work_orders_project_fk
  foreign key (project_id) references public.projects(id) on delete set null;

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  due_at date,
  completed_at timestamptz
);

-- -----------------------------------------------------------------------------
-- Stock
-- -----------------------------------------------------------------------------
create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_type text not null,
  label text not null,
  site_id uuid references public.sites(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stock_locations_updated_at before update on public.stock_locations
for each row execute function public.set_updated_at();

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text not null,
  description text not null,
  uom text not null default 'ea',
  serial_tracked boolean not null default false,
  batch_tracked boolean not null default false,
  min_qty numeric,
  max_qty numeric,
  preferred_vendor_id uuid,
  lead_time_days int,
  substitutes jsonb,
  compatibility jsonb,
  unit_cost numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku)
);

create trigger stock_items_updated_at before update on public.stock_items
for each row execute function public.set_updated_at();

create table public.stock_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  qty_on_hand numeric not null default 0,
  qty_reserved numeric not null default 0,
  unique (tenant_id, stock_item_id, location_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  movement_type text not null,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  qty numeric not null,
  serials jsonb,
  from_location_id uuid references public.stock_locations(id) on delete set null,
  to_location_id uuid references public.stock_locations(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  unit_cost numeric,
  idempotency_key uuid unique,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index stock_movements_wo_idx on public.stock_movements (work_order_id);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  qty numeric not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  released_at timestamptz
);

-- -----------------------------------------------------------------------------
-- Quotations & callbacks
-- -----------------------------------------------------------------------------
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  number text not null,
  status text not null default 'draft',
  valid_until date,
  totals jsonb not null default '{}'::jsonb,
  approval_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create trigger quotations_updated_at before update on public.quotations
for each row execute function public.set_updated_at();

alter table public.work_orders
  add constraint work_orders_quotation_fk
  foreign key (quotation_id) references public.quotations(id) on delete set null;

create table public.quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  line_type text not null,
  description text not null,
  qty numeric not null default 1,
  unit_price numeric not null default 0
);

create table public.callbacks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  prior_work_order_id uuid not null references public.work_orders(id) on delete cascade,
  new_work_order_id uuid not null references public.work_orders(id) on delete cascade,
  asset_id uuid references public.elevator_assets(id) on delete set null,
  reason_code text,
  analysis jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Maintenance
-- -----------------------------------------------------------------------------
create table public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  checklist jsonb not null default '[]'::jsonb,
  required_readings jsonb,
  applicable_types text[]
);

create table public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  template_id uuid references public.maintenance_templates(id) on delete set null,
  recurrence_rule jsonb not null,
  next_due_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger maintenance_plans_updated_at before update on public.maintenance_plans
for each row execute function public.set_updated_at();

create table public.maintenance_schedule_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.maintenance_plans(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'due',
  generated_work_order_id uuid references public.work_orders(id) on delete set null,
  skip_reason text,
  missed_reason text,
  unique (plan_id, due_at)
);

-- -----------------------------------------------------------------------------
-- Events & audit & attachments
-- -----------------------------------------------------------------------------
create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  actor_type text not null,
  actor_id uuid,
  object_type text not null,
  object_id uuid not null,
  visibility text not null default 'internal',
  payload jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index domain_events_object_idx on public.domain_events (tenant_id, object_type, object_id);
create index domain_events_created_idx on public.domain_events (tenant_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  actor_id uuid references public.profiles(id),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  filename text not null,
  mime text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Auth trigger: profile on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.numbering_sequences enable row level security;
alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_values enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.sites enable row level security;
alter table public.elevator_assets enable row level security;
alter table public.elevator_components enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_assets enable row level security;
alter table public.service_requests enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_assignments enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.stock_locations enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_line_items enable row level security;
alter table public.callbacks enable row level security;
alter table public.maintenance_templates enable row level security;
alter table public.maintenance_plans enable row level security;
alter table public.maintenance_schedule_instances enable row level security;
alter table public.domain_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.attachments enable row level security;

-- Membership helper
create or replace function public.current_tenant_ids()
returns setof uuid as $$
  select tenant_id from public.tenant_members
  where user_id = auth.uid() and is_active = true;
$$ language sql stable security definer set search_path = public;

-- Profiles: own row
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

-- Tenant members can read tenant rows
create policy tenants_member_select on public.tenants for select
  using (id in (select public.current_tenant_ids()));

-- Generic tenant table policy pattern (repeat per table)
create policy tenant_settings_member_all on public.tenant_settings for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy tenant_members_select on public.tenant_members for select
  using (tenant_id in (select public.current_tenant_ids()) or user_id = auth.uid());

-- Admins/owners invite members (not open self-join to arbitrary tenant_ids)
create policy tenant_members_insert on public.tenant_members for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_members.tenant_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.system_role in ('tenant_owner', 'company_admin')
    )
  );

create policy tenant_members_update on public.tenant_members for update
  using (tenant_id in (select public.current_tenant_ids()));

-- Apply to all tenant-scoped tables (all CRUD)
create policy numbering_sequences_policy on public.numbering_sequences for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy custom_field_definitions_policy on public.custom_field_definitions for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy custom_field_values_policy on public.custom_field_values for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy customers_policy on public.customers for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy customer_contacts_policy on public.customer_contacts for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy sites_policy on public.sites for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy elevator_assets_policy on public.elevator_assets for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy elevator_components_policy on public.elevator_components for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy contracts_policy on public.contracts for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy contract_assets_policy on public.contract_assets for all
  using (
    contract_id in (select id from public.contracts where tenant_id in (select public.current_tenant_ids()))
  )
  with check (
    contract_id in (select id from public.contracts where tenant_id in (select public.current_tenant_ids()))
  );

create policy service_requests_policy on public.service_requests for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy work_orders_policy on public.work_orders for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy work_order_assignments_policy on public.work_order_assignments for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy projects_policy on public.projects for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy project_milestones_policy on public.project_milestones for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy stock_locations_policy on public.stock_locations for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy stock_items_policy on public.stock_items for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy stock_balances_policy on public.stock_balances for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy stock_movements_policy on public.stock_movements for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy stock_reservations_policy on public.stock_reservations for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy quotations_policy on public.quotations for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy quotation_line_items_policy on public.quotation_line_items for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy callbacks_policy on public.callbacks for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy maintenance_templates_policy on public.maintenance_templates for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy maintenance_plans_policy on public.maintenance_plans for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy maintenance_schedule_instances_policy on public.maintenance_schedule_instances for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy domain_events_policy on public.domain_events for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy audit_logs_policy on public.audit_logs for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy attachments_policy on public.attachments for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

-- Bootstrap: use create_tenant_with_owner() — direct tenant insert disabled for safety
comment on table public.tenants is 'RLS: members see tenant; create via create_tenant_with_owner RPC.';

-- First tenant + owner row (bypasses RLS via SECURITY DEFINER)
create or replace function public.create_tenant_with_owner(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.tenants (name, slug) values (p_name, p_slug) returning id into tid;
  insert into public.tenant_members (tenant_id, user_id, system_role)
  values (tid, auth.uid(), 'tenant_owner');
  return tid;
end;
$$;

grant execute on function public.create_tenant_with_owner(text, text) to authenticated;
