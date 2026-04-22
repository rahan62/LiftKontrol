-- Küme durumu (kiracı başına güncel) ve sabah sevki için günlük ekip planı (en fazla 10 durak)

create table public.tenant_route_cluster_state (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  radius_km numeric(6,2) not null default 2 check (radius_km >= 0.5 and radius_km <= 50),
  updated_at timestamptz not null default now(),
  clusters jsonb not null default '[]'::jsonb
);

comment on table public.tenant_route_cluster_state is
  'Geographic clusters of routable elevators; JSON array of {index, centroid, ordered_asset_ids}.';

create table public.daily_crew_dispatches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  crew_id uuid not null references public.field_crews(id) on delete cascade,
  dispatch_date date not null,
  cluster_index int,
  max_stops int not null default 10 check (max_stops > 0 and max_stops <= 50),
  generated_at timestamptz not null default now(),
  unique (tenant_id, crew_id, dispatch_date)
);

create index daily_crew_dispatches_tenant_date_idx on public.daily_crew_dispatches (tenant_id, dispatch_date);

create table public.daily_crew_dispatch_stops (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dispatch_id uuid not null references public.daily_crew_dispatches(id) on delete cascade,
  sequence int not null check (sequence >= 0),
  elevator_asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  unique (dispatch_id, sequence)
);

create index daily_crew_dispatch_stops_dispatch_idx on public.daily_crew_dispatch_stops (dispatch_id, sequence);
create index daily_crew_dispatch_stops_tenant_idx on public.daily_crew_dispatch_stops (tenant_id);

alter table public.tenant_route_cluster_state enable row level security;
alter table public.daily_crew_dispatches enable row level security;
alter table public.daily_crew_dispatch_stops enable row level security;

create policy tenant_route_cluster_state_policy on public.tenant_route_cluster_state for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy daily_crew_dispatches_policy on public.daily_crew_dispatches for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create policy daily_crew_dispatch_stops_policy on public.daily_crew_dispatch_stops for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
