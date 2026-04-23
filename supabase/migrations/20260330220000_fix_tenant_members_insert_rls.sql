-- INSERT policy on tenant_members used:
--   EXISTS (SELECT 1 FROM tenant_members tm WHERE ...)
-- That inner SELECT re-applies RLS on tenant_members (including the same INSERT policy chain) → infinite
-- recursion when adding members (e.g. platform admin), even if current_tenant_ids() is fixed.
--
-- Replace with a SECURITY DEFINER helper that reads tenant_members with row_security off.

create or replace function public.user_can_invite_to_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path to public
set row_security to off
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.system_role in ('tenant_owner', 'company_admin')
  );
$$;

comment on function public.user_can_invite_to_tenant(uuid) is
  'True if caller may INSERT tenant_members for this tenant (owner/company_admin). Bypasses RLS to avoid recursion.';

grant execute on function public.user_can_invite_to_tenant(uuid) to authenticated;
grant execute on function public.user_can_invite_to_tenant(uuid) to service_role;

drop policy if exists tenant_members_insert on public.tenant_members;
create policy tenant_members_insert on public.tenant_members
  for insert
  with check (public.user_can_invite_to_tenant(tenant_id));

-- Align SELECT / UPDATE with the same pattern so nothing on tenant_members calls current_tenant_ids()
-- (avoids any remaining evaluator recursion on this table).

create or replace function public.user_is_active_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path to public
set row_security to off
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  );
$$;

comment on function public.user_is_active_tenant_member(uuid) is
  'True if caller has an active tenant_members row for this tenant; RLS-safe.';

grant execute on function public.user_is_active_tenant_member(uuid) to authenticated;
grant execute on function public.user_is_active_tenant_member(uuid) to service_role;

drop policy if exists tenant_members_select on public.tenant_members;
create policy tenant_members_select on public.tenant_members
  for select using (
    public.user_is_active_tenant_member(tenant_id)
    or user_id = auth.uid()
  );

drop policy if exists tenant_members_update on public.tenant_members;
create policy tenant_members_update on public.tenant_members
  for update
  using (public.user_is_active_tenant_member(tenant_id));

-- Platform operators still use tenant_members_platform_all (FOR ALL, permissive OR with policies above).
