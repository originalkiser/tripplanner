-- Minimal settings store for the OpenRouteService API key (Phase 5 routing).
-- No client-facing SELECT/INSERT/UPDATE policies at all — this table is only
-- ever touched by service-role Edge Functions (set-integration-key, route).
-- trip.has_setting() lets the client check "is a key configured?" without
-- ever reading the value back out.

create table trip.app_settings (
  key text primary key,
  value text,
  updated_by uuid references trip.user_profiles (id),
  updated_at timestamptz not null default now()
);

alter table trip.app_settings enable row level security;

create function trip.has_setting(setting_key text)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select exists (
    select 1 from trip.app_settings
    where key = setting_key and value is not null and value <> ''
  );
$$;

grant execute on function trip.has_setting(text) to authenticated;
