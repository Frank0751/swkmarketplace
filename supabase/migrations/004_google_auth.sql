-- ─── 004: Google sign-in support ───────────────────────────────────────────────
--
-- OAuth users never run the client-side profile insert that email signup does,
-- so create the public.users row automatically for every new auth user.
-- Works for Google, email/password, and any future provider.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := meta->>'role';
begin
  insert into public.users (id, email, full_name, avatar_url, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(meta->>'full_name', ''),
      nullif(meta->>'name', ''),          -- Google provides "name"
      split_part(coalesce(new.email, 'member'), '@', 1)
    ),
    coalesce(
      nullif(meta->>'avatar_url', ''),
      nullif(meta->>'picture', '')        -- Google provides "picture"
    ),
    -- Only trust roles that email signup legitimately sets; everything else is a buyer.
    -- Vendors still go through the application + admin approval flow.
    case when requested_role in ('buyer', 'vendor') then requested_role::user_role else 'buyer'::user_role end,
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any existing auth users missing a profile row
insert into public.users (id, email, full_name, avatar_url, role, status)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(
    nullif(au.raw_user_meta_data->>'full_name', ''),
    nullif(au.raw_user_meta_data->>'name', ''),
    split_part(coalesce(au.email, 'member'), '@', 1)
  ),
  coalesce(
    nullif(au.raw_user_meta_data->>'avatar_url', ''),
    nullif(au.raw_user_meta_data->>'picture', '')
  ),
  'buyer'::user_role,
  'active'
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;
