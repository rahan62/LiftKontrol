-- Apple In-App Purchase subscription linkage (App Store Guideline 3.1.1).

alter table public.tenant_subscriptions
  add column if not exists billing_provider text,
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_product_id text,
  add column if not exists apple_environment text;

comment on column public.tenant_subscriptions.billing_provider is 'e.g. apple, iyzico, manual';
comment on column public.tenant_subscriptions.apple_original_transaction_id is 'StoreKit originalTransactionId; one active provisioning per value.';
comment on column public.tenant_subscriptions.apple_product_id is 'App Store Connect product identifier at purchase time.';
comment on column public.tenant_subscriptions.apple_environment is 'Sandbox or Production from Apple-signed transaction payload.';

create unique index if not exists tenant_subscriptions_apple_original_txn_key
  on public.tenant_subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
