-- EN 81-20 control authority, maintenance transfer basis, revision article catalog, monthly visit checklist

alter table public.elevator_assets
  add column if not exists en8120_control_authority text
    check (en8120_control_authority is null or en8120_control_authority in ('government', 'private_control_company')),
  add column if not exists private_control_company_name text,
  add column if not exists en8120_next_control_due date,
  add column if not exists maintenance_transfer_basis text
    check (maintenance_transfer_basis is null or maintenance_transfer_basis in ('direct_after_prior_expiry', 'after_annual_en8120'));

comment on column public.elevator_assets.en8120_control_authority is 'Periodic EN 81-20 control: government notified body vs private accredited control company.';
comment on column public.elevator_assets.private_control_company_name is 'Name when en8120_control_authority = private_control_company.';
comment on column public.elevator_assets.maintenance_transfer_basis is 'How maintainer took over: after prior contract ended, or after annual EN 81-20 / revision cycle.';

alter table public.contracts
  add column if not exists maintenance_transfer_basis text
    check (maintenance_transfer_basis is null or maintenance_transfer_basis in ('direct_after_prior_expiry', 'after_annual_en8120'));

comment on column public.contracts.maintenance_transfer_basis is 'Direct monthly contract after prior expiry vs takeover after annual EN 81-20 revision.';

create table if not exists public.revision_articles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sort_order int not null default 0,
  article_code text not null,
  title text not null,
  description text,
  default_cost_try numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, article_code)
);

create index if not exists revision_articles_tenant_idx on public.revision_articles (tenant_id, sort_order);

create trigger revision_articles_updated_at before update on public.revision_articles
for each row execute function public.set_updated_at();

alter table public.elevator_monthly_maintenance
  add column if not exists monthly_checklist jsonb not null default '{}'::jsonb;

comment on column public.elevator_monthly_maintenance.monthly_checklist is 'Monthly visit points: rails, doors, engine oil, brakes, buffer — values ok|issue|na.';

alter table public.revision_articles enable row level security;

create policy revision_articles_policy on public.revision_articles for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
