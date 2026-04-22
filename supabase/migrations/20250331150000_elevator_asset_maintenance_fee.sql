-- Periodic maintenance fee is per elevator unit (not per site), with cadence monthly or yearly.

alter table public.elevator_assets
  add column if not exists maintenance_fee numeric(14,2),
  add column if not exists maintenance_fee_period text;

alter table public.elevator_assets
  drop constraint if exists elevator_assets_maintenance_fee_period_chk;

alter table public.elevator_assets
  add constraint elevator_assets_maintenance_fee_period_chk
  check (maintenance_fee_period is null or maintenance_fee_period in ('monthly', 'yearly'));

comment on column public.elevator_assets.maintenance_fee is 'Periodic contracted maintenance fee for this unit (currency: tenant billing default, typically TRY).';
comment on column public.elevator_assets.maintenance_fee_period is 'Fee cadence: monthly or yearly.';
