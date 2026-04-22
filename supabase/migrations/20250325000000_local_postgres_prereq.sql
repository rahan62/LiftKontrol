-- Prerequisite for plain PostgreSQL (no Supabase Auth stack).
-- Creates minimal auth schema so the main migration can reference auth.users and auth.uid().

create extension if not exists pgcrypto;

create schema if not exists auth;

-- Minimal users table for public.profiles FK (shape compatible with profile trigger)
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- JWT sub equivalent — returns NULL when not set (local psql / direct connections)
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;

-- Role used by GRANT in main migration (Supabase maps requests to this role)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
