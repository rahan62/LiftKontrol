-- Field crews, monthly maintenance route plans, daily stops, optional WO → crew block

create table public.field_crews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create trigger field_crews_updated_at before update on public.field_crews
for each row execute function public.set_updated_at();

create table public.field_crew_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  crew_id uuid not null references public.field_crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (crew_id, user_id)
);

create index field_crew_members_crew_idx on public.field_crew_members (crew_id);
create index field_crew_members_tenant_idx on public.field_crew_members (tenant_id);

create table public.monthly_route_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  crew_id uuid not null references public.field_crews(id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  visits_per_day int not null default 10 check (visits_per_day > 0 and visits_per_day <= 50),
  generated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  unique (tenant_id, crew_id, year_month)
);

create index monthly_route_plans_tenant_ym_idx on public.monthly_route_plans (tenant_id, year_month);

create table public.daily_route_stops (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.monthly_route_plans(id) on delete cascade,
  service_date date not null,
  sequence int not null check (sequence >= 0),
  elevator_asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  cluster_index int not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'skipped')),
  meta jsonb not null default '{}'::jsonb,
  unique (plan_id, service_date, sequence)
);

create index daily_route_stops_plan_date_idx on public.daily_route_stops (plan_id, service_date);
create index daily_route_stops_tenant_date_idx on public.daily_route_stops (tenant_id, service_date);

alter table public.work_orders
  add column if not exists blocking_crew_id uuid references public.field_crews(id) on delete set null;

create index work_orders_blocking_crew_idx on public.work_orders (tenant_id, blocking_crew_id)
  where blocking_crew_id is not null;

alter table public.field_crews enable row level security;
alter table public.field_crew_members enable row level security;
alter table public.monthly_route_plans enable row level security;
alter table public.daily_route_stops enable row level security;

create policy field_crews_policy on public.field_crews for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy field_crew_members_policy on public.field_crew_members for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy monthly_route_plans_policy on public.monthly_route_plans for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy daily_route_stops_policy on public.daily_route_stops for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
