-- Monthly per-elevator maintenance, parts usage with finance + stock, extended stock metadata, contracts file path, site management type

alter table public.sites
  add column if not exists management_type text check (management_type in ('resident', 'management_company'));

comment on column public.sites.management_type is 'resident = site self-managed; management_company = professional site management.';

alter table public.finance_entries
  add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid'));

alter table public.contracts
  add column if not exists stored_file_path text,
  add column if not exists counterparty_name text;

alter table public.stock_items
  add column if not exists part_category text,
  add column if not exists subsystem text,
  add column if not exists manufacturer text,
  add column if not exists oem_part_number text,
  add column if not exists compatibility_notes text,
  add column if not exists material_grade text;

comment on column public.stock_items.subsystem is 'door, traction, safety, hydraulic, controller, electrical, cabin, guide, other';

-- One row per elevator per calendar month (year_month = first day of month)
create table public.elevator_monthly_maintenance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  elevator_asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  year_month date not null,
  completed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, elevator_asset_id, year_month)
);

create index elevator_monthly_maintenance_tenant_month_idx
  on public.elevator_monthly_maintenance (tenant_id, year_month);

alter table public.elevator_monthly_maintenance enable row level security;

create policy elevator_monthly_maintenance_policy on public.elevator_monthly_maintenance for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

-- Batched parts usage: lines share batch_id and one finance_entry_id
create table public.service_parts_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null,
  elevator_asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  qty numeric not null check (qty > 0),
  unit_price numeric not null,
  work_type text not null check (work_type in ('maintenance', 'revision', 'repair', 'assembly')),
  monthly_maintenance_id uuid references public.elevator_monthly_maintenance(id) on delete set null,
  finance_entry_id uuid references public.finance_entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create index service_parts_usage_tenant_idx on public.service_parts_usage (tenant_id, created_at desc);
create index service_parts_usage_batch_idx on public.service_parts_usage (batch_id);

alter table public.service_parts_usage enable row level security;

create policy service_parts_usage_policy on public.service_parts_usage for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

-- Stock movements: optional link to elevator for traceability
alter table public.stock_movements
  add column if not exists elevator_asset_id uuid references public.elevator_assets(id) on delete set null,
  add column if not exists parts_usage_batch_id uuid;
