-- "Home" tab: where the group is staying. Single row per trip, editable by
-- anyone (matches the rest of the app's "everyone has equal standing" model).
create table trip.stays (
  trip_id uuid primary key references trip.trips (id) on delete cascade,
  name text,
  address text,
  notes text,
  link_url text,
  updated_by uuid references trip.user_profiles (id),
  updated_at timestamptz not null default now()
);

alter table trip.stays enable row level security;

create policy stays_select on trip.stays for select to authenticated using (true);
create policy stays_insert on trip.stays for insert to authenticated with check (true);
create policy stays_update on trip.stays for update to authenticated using (true) with check (true);
