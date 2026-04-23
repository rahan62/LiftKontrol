-- Platform operators (Lift Kontrol internal admin), tenant commercial fields,
-- subscriptions & payments, public marketing copy (read from main app via DATABASE_URL).

-- -----------------------------------------------------------------------------
-- Platform operator flag (SECURITY DEFINER — bypasses RLS on lookup)
-- -----------------------------------------------------------------------------
create table if not exists public.platform_operators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  role text not null default 'admin'
    check (role in ('owner', 'admin', 'support')),
  created_at timestamptz not null default now()
);

create index if not exists platform_operators_user_idx on public.platform_operators (user_id);

alter table public.platform_operators enable row level security;

create or replace function public.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_operators po
    where po.user_id = auth.uid()
  );
$$;

comment on function public.is_platform_operator() is 'True if auth.uid() is a Lift Kontrol platform admin (bypasses RLS on platform_operators).';

-- Operators see all operator rows; others see nothing (no self row without being operator)
create policy platform_operators_select on public.platform_operators
  for select using (
    user_id = auth.uid()
    or public.is_platform_operator()
  );

-- No client-side insert/update/delete — manage membership via SQL or seed script (service role).

-- -----------------------------------------------------------------------------
-- Tenant commercial / CRM (SaaS customer = tenants row — extended, not a second “firm” table)
-- -----------------------------------------------------------------------------
alter table public.tenants
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists billing_address jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended', 'churned')),
  add column if not exists contract_pricing_summary text,
  add column if not exists marketing_display_note text,
  add column if not exists notes_internal text;

comment on column public.tenants.contract_pricing_summary is 'Internal / contract pricing note shown in platform admin.';
comment on column public.tenants.marketing_display_note is 'Optional per-tenant note for proposals; public site uses platform_settings.marketing_pricing.';

-- -----------------------------------------------------------------------------
-- Global marketing copy (editable from platform admin; main app reads via Postgres pool)
-- -----------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger platform_settings_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

-- Only platform operators via Supabase session; everyone else denied by default (no other policies).
create policy platform_settings_platform_all on public.platform_settings
  for all
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

insert into public.platform_settings (key, value) values (
  'marketing_pricing',
  jsonb_build_object(
    'eyebrow', 'Şeffaf fiyat',
    'title', 'Tek paket. Tüm operasyonunuz.',
    'description', 'Gizli ücret yok, kullanıcı başına ek maliyet yok. İlk yılınıza özel kampanya fiyatı ile Lift Kontrol''ü hemen kullanmaya başlayın.',
    'campaignBadge', 'İlk yıla özel',
    'packageTitle', 'Lift Kontrol — Kurumsal',
    'packageSubtitle', 'Yıllık lisans · tüm modüller dahil',
    'priceMain', '12.000',
    'priceUnit', 'TL',
    'priceNote', '+ KDV · peşin yıllık faturalama',
    'features', jsonb_build_array(
      'Sınırsız kullanıcı ve rol bazlı yetkilendirme',
      'Müşteri, saha ve asansör varlıkları — tek merkezden',
      'Aylık bakım planlama, arıza ve iş emirleri',
      'Günlük ekip sevkı ve rota planlama',
      'Periyodik kontrol, revizyon ve teklif süreçleri',
      'Stok, depo ve finans takibi',
      'iOS saha uygulaması ve QR ile asansör sayfası',
      'Çok kiracılı, güvenli bulut altyapısı'
    ),
    'footerNote', 'Fiyat, kampanya süresi ve kurumsal ihtiyaçlar için özel koşullar hakkında bilgi almak istiyorsanız'
  )
)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Subscriptions & payments (per tenant)
-- -----------------------------------------------------------------------------
create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_code text not null default 'standard',
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due', 'trial', 'expired')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  seat_limit int,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_subscriptions_tenant_idx
  on public.tenant_subscriptions (tenant_id, started_at desc);

create trigger tenant_subscriptions_updated_at
before update on public.tenant_subscriptions
for each row execute function public.set_updated_at();

alter table public.tenant_subscriptions enable row level security;

create policy tenant_subscriptions_member_select on public.tenant_subscriptions
  for select using (tenant_id in (select public.current_tenant_ids()));

create policy tenant_subscriptions_platform_all on public.tenant_subscriptions
  for all
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

create table if not exists public.tenant_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  amount_cents bigint not null,
  currency text not null default 'TRY',
  paid_at timestamptz not null default now(),
  description text,
  external_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tenant_payments_tenant_idx
  on public.tenant_payments (tenant_id, paid_at desc);

alter table public.tenant_payments enable row level security;

create policy tenant_payments_member_select on public.tenant_payments
  for select using (tenant_id in (select public.current_tenant_ids()));

create policy tenant_payments_platform_all on public.tenant_payments
  for all
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

-- -----------------------------------------------------------------------------
-- RLS: platform operators — tenants & members & profiles
-- -----------------------------------------------------------------------------
create policy tenants_platform_select on public.tenants
  for select using (public.is_platform_operator());

create policy tenants_platform_insert on public.tenants
  for insert with check (public.is_platform_operator());

create policy tenants_platform_update on public.tenants
  for update
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

create policy tenants_platform_delete on public.tenants
  for delete using (public.is_platform_operator());

create policy tenant_members_platform_all on public.tenant_members
  for all
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

create policy profiles_platform_select on public.profiles
  for select using (public.is_platform_operator());

create policy profiles_platform_update on public.profiles
  for update
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

create policy tenant_settings_platform_all on public.tenant_settings
  for all
  using (public.is_platform_operator())
  with check (public.is_platform_operator());

grant execute on function public.is_platform_operator() to authenticated;
grant execute on function public.is_platform_operator() to service_role;
