-- Site building stats, maintenance fee/notes, and finance ledger entries (per site or per elevator)

alter table public.sites
  add column if not exists floor_count integer,
  add column if not exists elevator_count integer,
  add column if not exists maintenance_fee numeric(14,2),
  add column if not exists maintenance_fee_period text,
  add column if not exists maintenance_notes text;

comment on column public.sites.floor_count is 'Number of floors in the building.';
comment on column public.sites.elevator_count is 'Declared elevator units in the building (may differ from registered assets).';
comment on column public.sites.maintenance_fee is 'Periodic maintenance fee amount in currency.';
comment on column public.sites.maintenance_fee_period is 'e.g. monthly, quarterly, annual.';
comment on column public.sites.maintenance_notes is 'Maintenance scope, schedule, or agreement notes for this site.';

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  elevator_asset_id uuid references public.elevator_assets(id) on delete cascade,
  entry_type text not null default 'other' check (entry_type in (
    'invoice', 'payment', 'credit_note', 'fee', 'adjustment', 'other'
  )),
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  label text not null,
  notes text,
  occurred_on date not null default (current_date),
  created_at timestamptz not null default now(),
  constraint finance_entries_scope_chk check (
    (site_id is not null and elevator_asset_id is null)
    or (site_id is null and elevator_asset_id is not null)
  )
);

create index finance_entries_tenant_idx on public.finance_entries (tenant_id, occurred_on desc);
create index finance_entries_site_idx on public.finance_entries (site_id);
create index finance_entries_asset_idx on public.finance_entries (elevator_asset_id);

alter table public.finance_entries enable row level security;

create policy finance_entries_policy on public.finance_entries for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
