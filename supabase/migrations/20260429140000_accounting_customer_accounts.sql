-- Muhasebe: müşteri bazlı cari hesap + finance_entries.customer_id (tenant scoped)

-- -----------------------------------------------------------------------------
-- Cari hesap (müşteri başına bir kayıt; müşteri oluşunca otomatik)
-- -----------------------------------------------------------------------------
create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, customer_id)
);

create index if not exists customer_accounts_tenant_idx on public.customer_accounts (tenant_id);
create index if not exists customer_accounts_customer_idx on public.customer_accounts (customer_id);

comment on table public.customer_accounts is 'Per-tenant current account opened for each customer; ledger lines aggregate via finance_entries.customer_id.';

alter table public.customer_accounts enable row level security;

create policy customer_accounts_policy on public.customer_accounts for all
  using (tenant_id in (select public.current_tenant_ids()))
  with check (tenant_id in (select public.current_tenant_ids()));

-- -----------------------------------------------------------------------------
-- finance_entries: müşteri bağlantısı + şirket gideri (saha/asansör yok)
-- -----------------------------------------------------------------------------
alter table public.finance_entries
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists finance_entries_customer_idx on public.finance_entries (tenant_id, customer_id);

-- Genişletilmiş entry_type
alter table public.finance_entries drop constraint if exists finance_entries_entry_type_check;
alter table public.finance_entries add constraint finance_entries_entry_type_check check (
  entry_type in ('invoice', 'payment', 'credit_note', 'fee', 'adjustment', 'other', 'expense')
);

-- Eski kapsam kuralını genişlet: şirket içi gider satırı (tenant bazlı, müşteri yok)
alter table public.finance_entries drop constraint if exists finance_entries_scope_chk;
alter table public.finance_entries add constraint finance_entries_scope_chk check (
  (site_id is not null and elevator_asset_id is null and entry_type <> 'expense')
  or (site_id is null and elevator_asset_id is not null and entry_type <> 'expense')
  or (
    site_id is null
    and elevator_asset_id is null
    and entry_type = 'expense'
  )
);

-- Geçmiş satırlar: customer_id doldur
update public.finance_entries fe
set customer_id = s.customer_id
from public.sites s
where fe.site_id = s.id
  and fe.tenant_id = s.tenant_id
  and fe.customer_id is null;

update public.finance_entries fe
set customer_id = ea.customer_id
from public.elevator_assets ea
where fe.elevator_asset_id = ea.id
  and fe.tenant_id = ea.tenant_id
  and fe.customer_id is null;

-- Mevcut müşteriler için cari aç
insert into public.customer_accounts (tenant_id, customer_id)
select c.tenant_id, c.id
from public.customers c
on conflict (tenant_id, customer_id) do nothing;

-- Müşteri oluşturulunca cari aç
create or replace function public.trg_customers_open_account()
returns trigger as $$
begin
  insert into public.customer_accounts (tenant_id, customer_id)
  values (new.tenant_id, new.id)
  on conflict (tenant_id, customer_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists customers_open_account on public.customers;
create trigger customers_open_account
after insert on public.customers
for each row execute function public.trg_customers_open_account();

-- finance_entries: site/asansörden customer_id türet; expense için sıfırla
create or replace function public.trg_finance_entries_set_customer_id()
returns trigger as $$
begin
  if new.entry_type = 'expense' then
    new.customer_id := null;
    return new;
  end if;
  if new.site_id is not null and new.elevator_asset_id is null then
    select s.customer_id into new.customer_id
    from public.sites s
    where s.id = new.site_id and s.tenant_id = new.tenant_id;
  elsif new.elevator_asset_id is not null and new.site_id is null then
    select ea.customer_id into new.customer_id
    from public.elevator_assets ea
    where ea.id = new.elevator_asset_id and ea.tenant_id = new.tenant_id;
  else
    new.customer_id := null;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists finance_entries_set_customer on public.finance_entries;
create trigger finance_entries_set_customer
before insert or update of site_id, elevator_asset_id, entry_type on public.finance_entries
for each row execute function public.trg_finance_entries_set_customer_id();
