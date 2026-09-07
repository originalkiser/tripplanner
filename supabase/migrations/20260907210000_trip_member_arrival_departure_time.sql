-- Arrival/departure need a time, not just a date (e.g. "landing at 6pm"),
-- matching the timestamptz pattern already used for stays.check_in_at /
-- check_out_at.
alter table trip.trip_members rename column arrival_date to arrival_at;
alter table trip.trip_members rename column departure_date to departure_at;
alter table trip.trip_members alter column arrival_at type timestamptz using arrival_at::timestamptz;
alter table trip.trip_members alter column departure_at type timestamptz using departure_at::timestamptz;
