-- Replaces the OAuth-oriented login check with a claim-your-password flow:
-- admin/users pre-seed an account by email (see scripts/seed-users.mjs), and
-- the very first login accepts ANY password and locks it in as that user's
-- real password. Admins can force this to happen again ("reset to null") by
-- giving the account a new unknown password and flipping password_set back
-- to false.

alter table trip.user_profiles add column password_set boolean not null default false;

drop function if exists trip.email_has_account(text);

create or replace function trip.check_login_email(check_email text)
returns jsonb
language sql
stable
security definer
set search_path = trip, public
as $$
  select jsonb_build_object(
    'exists', exists(select 1 from trip.user_profiles where lower(email) = lower(check_email)),
    'needs_setup', coalesce(
      (select not password_set from trip.user_profiles where lower(email) = lower(check_email) limit 1),
      false
    )
  );
$$;

grant execute on function trip.check_login_email(text) to anon;
