-- Fix infinite recursion in users/contracts RLS policies.
-- Run once in the Supabase SQL editor on top of the original schema.
--
-- Background: the original policies queried public.users from inside a policy
-- attached to public.users, which causes Postgres to re-evaluate RLS on the
-- same table and fail with "infinite recursion detected in policy". As a
-- result, even the user's own profile lookup after sign-in returned an error,
-- and the LoginForm surfaced that as "Your account is not active."
--
-- The fix: move the role check into a SECURITY DEFINER function that bypasses
-- RLS, and reference that function from the policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Replace recursive USERS policies
drop policy if exists "users_admin_read" on public.users;
create policy "users_admin_read" on public.users
  for select using (public.is_admin());

drop policy if exists "users_admin_update" on public.users;
create policy "users_admin_update" on public.users
  for update using (public.is_admin());

drop policy if exists "users_admin_insert" on public.users;
create policy "users_admin_insert" on public.users
  for insert with check (public.is_admin());

-- Replace recursive CONTRACTS admin policies
drop policy if exists "contracts_admin_read" on public.contracts;
create policy "contracts_admin_read" on public.contracts
  for select using (public.is_admin());

drop policy if exists "contracts_admin_update" on public.contracts;
create policy "contracts_admin_update" on public.contracts
  for update using (public.is_admin());
