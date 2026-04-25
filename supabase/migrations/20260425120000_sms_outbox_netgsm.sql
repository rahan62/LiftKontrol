-- Kuyruk: Netgsm ile gönderilecek SMS kayıtları (cron tüketicisi sırayla işler).

create table if not exists public.sms_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  phone text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  last_error text,
  provider_job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_outbox_pending_created_idx
  on public.sms_outbox (created_at asc)
  where status = 'pending';

create index if not exists sms_outbox_sending_updated_idx
  on public.sms_outbox (updated_at asc)
  where status = 'sending';

create trigger sms_outbox_updated_at
  before update on public.sms_outbox
  for each row execute function public.set_updated_at();

alter table public.sms_outbox enable row level security;

comment on table public.sms_outbox is 'SMS gönderim kuyruğu; yalnız sunucu (DATABASE_URL / service role) yazar. Netgsm cron: /api/cron/sms-outbox';
