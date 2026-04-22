-- Revizyon: 60 günlük son tarih, sözleşmede anlaşılan hedef etiket, ara aşamalar, 2. kontrol raporu

alter table public.elevator_revisions
  add column if not exists agreed_target_ticket text
    check (agreed_target_ticket is null or agreed_target_ticket in ('green', 'blue', 'yellow', 'red'));

alter table public.elevator_revisions
  add column if not exists contract_signed_at timestamptz;

alter table public.elevator_revisions
  add column if not exists purchasing_completed_at timestamptz;

alter table public.elevator_revisions
  add column if not exists work_started_at timestamptz;

alter table public.elevator_revisions
  add column if not exists deadline_at date;

alter table public.elevator_revisions
  add column if not exists second_control_report_path text;

alter table public.elevator_revisions
  add column if not exists needs_rework boolean not null default false;

comment on column public.elevator_revisions.agreed_target_ticket is
  'Contract: minimum acceptable final label (green>blue>yellow>red). If final inspection computes worse, block or flag rework.';
comment on column public.elevator_revisions.deadline_at is
  'Typically periodic control_date + 60 days (legal correction window).';
comment on column public.elevator_revisions.second_control_report_path is
  'Follow-up control firm PDF after site work; required before final inspection submit.';

-- Mevcut onaylı kayıtlar için ara aşamaları doldur (yeni zorunlu adımlarla uyum)
update public.elevator_revisions
set purchasing_completed_at = coalesce(purchasing_completed_at, approved_at),
    work_started_at = coalesce(work_started_at, approved_at)
where approval_status = 'approved'
  and approved_at is not null
  and (purchasing_completed_at is null or work_started_at is null);
