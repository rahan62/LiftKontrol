-- EN 81-20 article ticket tier (green/blue/yellow/red), periodic control status,
-- revision approval / scheduling / final inspection ticket

alter table public.revision_articles
  add column if not exists ticket_tier text not null default 'green'
    check (ticket_tier in ('green', 'blue', 'yellow', 'red'));

comment on column public.revision_articles.ticket_tier is
  'TS EN 81-20 risk band: green (critical for full compliance), blue, yellow (unsafe usable), red (not safe).';

alter table public.periodic_controls
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled'));

comment on column public.periodic_controls.status is 'scheduled = company contacted; completed after visit.';

alter table public.elevator_revisions
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected'));
alter table public.elevator_revisions
  add column if not exists approved_at timestamptz;
alter table public.elevator_revisions
  add column if not exists scheduled_work_at date;
alter table public.elevator_revisions
  add column if not exists work_completed_at timestamptz;
alter table public.elevator_revisions
  add column if not exists final_inspection_at timestamptz;
alter table public.elevator_revisions
  add column if not exists final_ticket text
    check (final_ticket is null or final_ticket in ('green', 'blue', 'yellow', 'red'));
alter table public.elevator_revisions
  add column if not exists final_fulfilled_article_ids uuid[] not null default '{}';

comment on column public.elevator_revisions.final_fulfilled_article_ids is
  'Revision article IDs marked fulfilled at final control-company revisit; drives final_ticket.';
