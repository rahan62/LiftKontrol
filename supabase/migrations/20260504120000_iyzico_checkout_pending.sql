-- Encrypted pending signup blobs keyed by iyzico checkout form token (server-side only).
create table if not exists public.iyzico_checkout_pending (
  checkout_token text primary key,
  ciphertext text not null,
  nonce text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists iyzico_checkout_pending_expires_idx on public.iyzico_checkout_pending (expires_at);

alter table public.iyzico_checkout_pending enable row level security;

comment on table public.iyzico_checkout_pending is
  'Pre-payment encrypted payload (company, email, password); consumed after successful iyzico retrieve. Service role only.';

alter table public.tenant_subscriptions
  add column if not exists iyzico_payment_id text;

comment on column public.tenant_subscriptions.iyzico_payment_id is
  'iyzico paymentId from Checkout Form retrieve; idempotent web provisioning.';

create unique index if not exists tenant_subscriptions_iyzico_payment_id_key
  on public.tenant_subscriptions (iyzico_payment_id)
  where iyzico_payment_id is not null;
