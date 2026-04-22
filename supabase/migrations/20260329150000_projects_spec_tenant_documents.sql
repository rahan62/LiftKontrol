-- Montaj / proje teknik dosyası + kiracı belge arşivi (S3 uyumlu stored_path)

alter table public.projects
  add column if not exists spec_file_path text,
  add column if not exists notes text;

comment on column public.projects.spec_file_path is 'S3 ref (s3:...) or legacy uploads/ relative path.';

create table if not exists public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  stored_path text not null,
  original_filename text,
  mime_type text,
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tenant_documents_tenant_created_idx
  on public.tenant_documents (tenant_id, created_at desc);

comment on table public.tenant_documents is 'Generic tenant file archive; stored_path uses s3: prefix or local relative path.';

alter table public.tenant_documents enable row level security;

create policy tenant_documents_policy on public.tenant_documents for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));
