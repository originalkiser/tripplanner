-- A sitewide "active trip" doesn't fit reality: different trips can be
-- happening at the same time with different attendees, so there's no
-- single trip that should be the default for everyone. Which trip a person
-- is looking at is now purely a personal choice (see lib/currentTrip.ts on
-- the client), defaulting to whichever of their own trips is happening now
-- or coming up next, computed from dates rather than stored anywhere.
--
-- trip.current_active_trip_id() was only ever used as a column DEFAULT
-- (safety net for app code that didn't explicitly set trip_id) — both
-- columns are already NOT NULL and every insert path already sets trip_id
-- explicitly, so the defaults are dead weight now that there's no
-- "the active trip" to default to.
alter table trip.activity_photos alter column trip_id drop default;
alter table trip.digests_daily alter column trip_id drop default;
drop function trip.current_active_trip_id();

alter table trip.trips drop column is_active;
