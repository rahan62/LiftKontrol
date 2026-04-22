-- Periodic EN 81-20 controls (form upload), elevator revisions with article lines, tenant logo path

alter table public.tenants
  add column if not exists logo_path text;

comment on column public.tenants.logo_path is 'Relative path under project root (e.g. uploads/logos/<tenant>/logo.png); local disk until S3.';

-- Allow tenant members to update own tenant row (e.g. logo) — was select-only
drop policy if exists tenants_member_update on public.tenants;
create policy tenants_member_update on public.tenants for update
  using (id in (select public.current_tenant_ids()))
  with check (id in (select public.current_tenant_ids()));

create table if not exists public.periodic_controls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  elevator_asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  control_date date not null,
  issuer_name text,
  notes text,
  form_file_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists periodic_controls_tenant_idx on public.periodic_controls (tenant_id, control_date desc);

create trigger periodic_controls_updated_at
before update on public.periodic_controls
for each row execute function public.set_updated_at();

alter table public.periodic_controls enable row level security;

create policy periodic_controls_policy on public.periodic_controls for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create table if not exists public.elevator_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  elevator_asset_id uuid not null references public.elevator_assets(id) on delete cascade,
  periodic_control_id uuid references public.periodic_controls(id) on delete set null,
  total_fee_try numeric(14,2) not null default 0,
  offer_pdf_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists elevator_revisions_tenant_idx on public.elevator_revisions (tenant_id, created_at desc);

create trigger elevator_revisions_updated_at
before update on public.elevator_revisions
for each row execute function public.set_updated_at();

alter table public.elevator_revisions enable row level security;

create policy elevator_revisions_policy on public.elevator_revisions for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

create table if not exists public.elevator_revision_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  revision_id uuid not null references public.elevator_revisions(id) on delete cascade,
  revision_article_id uuid not null references public.revision_articles(id) on delete restrict,
  unit_price_try numeric(14,2) not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (revision_id, revision_article_id)
);

create index if not exists elevator_revision_lines_revision_idx on public.elevator_revision_lines (revision_id);

alter table public.elevator_revision_lines enable row level security;

create policy elevator_revision_lines_policy on public.elevator_revision_lines for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
