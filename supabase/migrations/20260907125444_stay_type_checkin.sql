-- What kind of place the group is staying at, and (when relevant) when they
-- can check in/out — both come up specifically when setting up a new trip.
alter table trip.stays add column stay_type text
  check (stay_type is null or stay_type in ('house', 'apartment', 'hotel', 'other'));
alter table trip.stays add column check_in_at timestamptz;
alter table trip.stays add column check_out_at timestamptz;
