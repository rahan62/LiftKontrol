-- Fix "infinite recursion detected in policy for relation tenant_members" (and platform_operators).
--
-- 1) platform_operators SELECT must not call is_platform_operator(): that re-enters the same table's RLS.
-- 2) current_tenant_ids() reads tenant_members; under RLS, policies on tenant_members call it again → recursion.
--    SET row_security = off for the function body breaks the cycle (Supabase/Postgres SECURITY DEFINER alone
--    may still apply RLS depending on role).
-- 3) is_platform_operator() likewise uses SET row_security = off when reading platform_operators.

drop policy if exists platform_operators_select on public.platform_operators;
create policy platform_operators_select on public.platform_operators
  for select using (user_id = auth.uid());

create or replace function public.current_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path to public
set row_security to off
as $$
  select tenant_id from public.tenant_members
  where user_id = auth.uid() and is_active = true;
$$;

create or replace function public.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path to public
set row_security to off
as $$
  select exists (
    select 1 from public.platform_operators po
    where po.user_id = auth.uid()
  );
$$;

comment on function public.current_tenant_ids() is 'Membership helper; row_security off to avoid RLS recursion on tenant_members.';
comment on function public.is_platform_operator() is 'Platform admin check; row_security off when reading platform_operators.';

grant execute on function public.is_platform_operator() to authenticated;
grant execute on function public.is_platform_operator() to service_role;
