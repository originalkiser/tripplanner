-- "Home" tab: WiFi credentials for the group's stay. Single row per trip,
-- editable by anyone (matches stays' "everyone has equal standing" model).
create table trip.wifi_networks (
  trip_id uuid primary key references trip.trips (id) on delete cascade,
  ssid text,
  password text,
  security text not null default 'WPA' check (security in ('WPA', 'WEP', 'nopass')),
  updated_by uuid references trip.user_profiles (id),
  updated_at timestamptz not null default now()
);

alter table trip.wifi_networks enable row level security;

create policy wifi_networks_select on trip.wifi_networks for select to authenticated using (true);
create policy wifi_networks_insert on trip.wifi_networks for insert to authenticated with check (true);
create policy wifi_networks_update on trip.wifi_networks for update to authenticated using (true) with check (true);
