-- Lets the login screen check "is there an account for this email?" before
-- showing the password field, without exposing auth.users or user_profiles
-- rows to anonymous callers.

alter table trip.user_profiles add column email text;

update trip.user_profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function trip.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  insert into trip.user_profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- security definer + anon grant scoped to a single boolean-returning function,
-- so the login screen can check email existence pre-auth without any table
-- access being opened up to the anon role.
create function trip.email_has_account(check_email text)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select exists (
    select 1 from trip.user_profiles where lower(email) = lower(check_email)
  );
$$;

grant usage on schema trip to anon;
grant execute on function trip.email_has_account(text) to anon;
