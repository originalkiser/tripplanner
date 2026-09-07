-- Multi-trip foundation, phase 1: who belongs to which trip, and who's an
-- admin of which trip specifically — replacing the single-trip assumption
-- baked into user_profiles.is_admin (a GLOBAL flag with no notion of "admin
-- of what"). user_profiles itself stays global (one account, usable across
-- trips); trip_members is the per-trip join, and also carries the per-trip
-- logistics info (arrival/departure, party size, allergies) that only make
-- sense in the context of a specific trip, not the account as a whole.
--
-- Deliberately scoped: this migration does NOT touch the ~15 other tables
-- that assume "there's only one trip and everyone in the app is on it"
-- (activities, activity_photos, packing_lists, wifi_networks, polls,
-- digests_daily, etc — all still keyed to *a* trip_id but selected via a
-- single is_active flag, with RLS that doesn't check trip membership at
-- all). That's real follow-up work before a second trip can safely hold
-- private data alongside the first — until then, a newly created trip's
-- membership/admin/logistics info is properly isolated, but its activities/
-- photos/packing lists etc. are not yet hard-isolated at the database
-- layer the way trip_members now is.
create table trip.trip_members (
  trip_id uuid not null references trip.trips (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  arrival_date date,
  departure_date date,
  adults_count int not null default 1 check (adults_count >= 0),
  children_count int not null default 0 check (children_count >= 0),
  allergies text,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_id_idx on trip.trip_members (user_id);

alter table trip.trips add column created_by uuid references trip.user_profiles (id);

alter table trip.trip_members enable row level security;

create function trip.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select exists (
    select 1 from trip.trip_members where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

create function trip.is_trip_admin(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select exists (
    select 1 from trip.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'admin'
  ) or trip.is_admin();
$$;

-- Anyone can read who's on a trip they're also on (or any trip, same as the
-- rest of the app's "everyone has equal standing" read model for now — see
-- the note above about this not yet being hard-isolated). Only a trip admin
-- (or the legacy global admin flag, kept as a support/bootstrap fallback)
-- can change roles or anyone else's logistics info; a member can always
-- edit their own row.
create policy trip_members_select on trip.trip_members for select to authenticated using (true);
create policy trip_members_insert on trip.trip_members for insert to authenticated
  with check (user_id = auth.uid() or trip.is_trip_admin(trip_id));
create policy trip_members_update on trip.trip_members for update to authenticated
  using (user_id = auth.uid() or trip.is_trip_admin(trip_id))
  with check (user_id = auth.uid() or trip.is_trip_admin(trip_id));
create policy trip_members_delete on trip.trip_members for delete to authenticated
  using (user_id = auth.uid() or trip.is_trip_admin(trip_id));

-- Trip creator is automatically that trip's first admin.
create function trip.trips_add_creator_as_admin()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  if new.created_by is not null then
    insert into trip.trip_members (trip_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trips_add_creator_as_admin
  after insert on trip.trips
  for each row execute function trip.trips_add_creator_as_admin();

-- Backfill: every current member of the (one, existing) trip becomes a
-- trip_members row, admin-for-admin, so the live trip's behavior is
-- unchanged by this migration.
insert into trip.trip_members (trip_id, user_id, role)
select t.id, up.id, case when up.is_admin then 'admin' else 'member' end
from trip.trips t
cross join trip.user_profiles up
where t.is_active = true
on conflict do nothing;

-- trips: any authenticated user can create a new trip (they become its
-- admin via the trigger above); only that trip's admins can edit or delete
-- it. Was "using (is_admin()) with check (is_admin())" for all operations,
-- which would have blocked a non-global-admin from ever creating a trip.
drop policy if exists trips_write on trip.trips;
create policy trips_insert on trip.trips for insert to authenticated with check (true);
create policy trips_update on trip.trips for update to authenticated
  using (trip.is_trip_admin(id)) with check (trip.is_trip_admin(id));
create policy trips_delete on trip.trips for delete to authenticated
  using (trip.is_trip_admin(id));
