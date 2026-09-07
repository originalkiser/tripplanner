-- The digest currently misses two things the group actually does a lot of:
-- (1) general trip-album photo uploads (activity_id is null there, and the
-- photo_added trigger explicitly skipped those), and (2) photo likes
-- (no change_type/trigger existed for them at all). Both need a trip_id
-- that doesn't depend on going through an activity, since a general album
-- upload/like has none.

alter table trip.activity_changes add column trip_id uuid references trip.trips (id);

update trip.activity_changes ac
set trip_id = a.trip_id
from trip.activities a
where ac.activity_id = a.id and ac.trip_id is null;

-- A handful of legacy rows (pre-multi-trip) may not resolve via activities
-- (e.g. already-deleted activities cascade-deleted their rows, so this
-- mostly won't fire, but stay safe) — fall back to the single original
-- trip so nothing is left with a null trip_id before it's made required.
update trip.activity_changes
set trip_id = (select id from trip.trips order by created_at limit 1)
where trip_id is null;

alter table trip.activity_changes alter column trip_id set not null;
alter table trip.activity_changes alter column activity_id drop not null;

alter table trip.activity_changes drop constraint activity_changes_change_type_check;
alter table trip.activity_changes add constraint activity_changes_change_type_check
  check (change_type in ('created', 'updated', 'joined', 'left', 'invited', 'proposed_time', 'photo_added', 'photo_liked', 'comment'));

create index activity_changes_trip_id_idx on trip.activity_changes (trip_id);

-- photo_added: now fires for every upload, general trip-album ones
-- (activity_id null) included, resolving trip_id straight off the photo
-- instead of only through an activity.
create or replace function trip.log_photo_added()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  insert into trip.activity_changes (trip_id, activity_id, user_id, change_type, summary_text)
  values (new.trip_id, new.activity_id, new.user_id, 'photo_added', new.caption);
  return new;
end;
$$;

-- photo_liked: new — a like on a photo attached to an activity or a
-- general album photo, either way resolved off the photo's own trip_id.
create function trip.log_photo_liked()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  insert into trip.activity_changes (trip_id, activity_id, user_id, change_type)
  select ap.trip_id, ap.activity_id, new.user_id, 'photo_liked'
  from trip.activity_photos ap
  where ap.id = new.photo_id;
  return new;
end;
$$;

create trigger photo_likes_log
  after insert on trip.photo_likes
  for each row execute function trip.log_photo_liked();

-- RLS: was gated via is_trip_member(activity_trip_id(activity_id)), which
-- can't resolve for a null activity_id — trip_id is now the direct source
-- of truth for which trip a change belongs to.
drop policy activity_changes_select on trip.activity_changes;
create policy activity_changes_select on trip.activity_changes for select to authenticated
  using (trip.is_trip_member(trip_id));
