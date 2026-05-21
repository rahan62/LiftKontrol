-- Idempotent SMS enqueue (bakım bildirimi, aylık cari vb.) — çift gönderimi önlemek için.

alter table public.sms_outbox
  add column if not exists dedupe_key text;

comment on column public.sms_outbox.dedupe_key is 'Aynı iş için tek kayıt (tenant + anahtar); INSERT … ON CONFLICT ile çakışmada atlanır.';

create unique index if not exists sms_outbox_tenant_dedupe_uidx
  on public.sms_outbox (tenant_id, dedupe_key)
  where dedupe_key is not null;
