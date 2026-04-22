-- Link parça kullanımı to a work order (arıza/onarım kaydı) for traceability.

alter table public.service_parts_usage
  add column if not exists work_order_id uuid references public.work_orders(id) on delete set null;

create index if not exists service_parts_usage_work_order_idx
  on public.service_parts_usage (tenant_id, work_order_id)
  where work_order_id is not null;
