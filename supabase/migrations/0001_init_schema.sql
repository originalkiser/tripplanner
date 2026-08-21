-- Savannah/Tybee Trip Planner — initial schema
-- Schema: trip

create schema if not exists trip;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- trips (lets a second trip exist later without a migration)
-- ---------------------------------------------------------------------------
create table trip.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into trip.trips (name, start_date, end_date, is_active)
values ('Savannah & Tybee 2026', '2026-09-04', '2026-09-07', true);

-- ---------------------------------------------------------------------------
-- user_profiles (id = auth.users.id)
-- ---------------------------------------------------------------------------
create table trip.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  avatar_type text not null default 'preset' check (avatar_type in ('preset', 'custom')),
  primary_color text not null default '#1B7A8C',
  secondary_color text not null default '#2D5D7B',
  is_admin boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-provision a profile for any new auth user (OAuth or fallback email/password).
create function trip.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  insert into trip.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function trip.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------
create table trip.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trip.trips (id) on delete cascade,
  type text not null check (type in ('food', 'activity', 'food_and_activity')),
  name text not null,
  description text,
  proposed_date date,
  proposed_time time,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  location_place_id text,
  rating_avg numeric(2, 1),
  category text not null check (category in ('savannah', 'tybee')),
  source text not null default 'user_added' check (source in ('user_added', 'imported_note')),
  color_tag text,
  created_by uuid not null references trip.user_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_trip_id_idx on trip.activities (trip_id);
create index activities_proposed_date_idx on trip.activities (proposed_date);
create index activities_source_idx on trip.activities (source);

-- ---------------------------------------------------------------------------
-- activity_participants
-- ---------------------------------------------------------------------------
create table trip.activity_participants (
  activity_id uuid not null references trip.activities (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  status text not null default 'joined' check (status in ('joined', 'proposed_alt_time')),
  proposed_date date,
  proposed_time time,
  rating smallint check (rating between 1 and 5),
  joined_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

-- ---------------------------------------------------------------------------
-- activity_photos
-- ---------------------------------------------------------------------------
create table trip.activity_photos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references trip.activities (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index activity_photos_activity_id_idx on trip.activity_photos (activity_id);

-- ---------------------------------------------------------------------------
-- activity_changes (digest source)
-- ---------------------------------------------------------------------------
create table trip.activity_changes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references trip.activities (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id),
  change_type text not null check (
    change_type in ('created', 'updated', 'joined', 'proposed_time', 'photo_added', 'comment')
  ),
  summary_text text,
  created_at timestamptz not null default now()
);

create index activity_changes_created_at_idx on trip.activity_changes (created_at);

-- ---------------------------------------------------------------------------
-- digests_daily
-- ---------------------------------------------------------------------------
create table trip.digests_daily (
  date date primary key,
  generated_summary jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- change-log triggers
-- ---------------------------------------------------------------------------
create function trip.log_activity_created()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (new.id, new.created_by, 'created', new.name);
  return new;
end;
$$;

create trigger activities_log_created
  after insert on trip.activities
  for each row execute function trip.log_activity_created();

create function trip.log_activity_updated()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  new.updated_at := now();
  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (new.id, new.created_by, 'updated', new.name);
  return new;
end;
$$;

create trigger activities_log_updated
  before update on trip.activities
  for each row execute function trip.log_activity_updated();

create function trip.log_participant_change()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (
    new.activity_id,
    new.user_id,
    case when new.status = 'proposed_alt_time' then 'proposed_time' else 'joined' end,
    null
  );
  return new;
end;
$$;

create trigger activity_participants_log
  after insert or update on trip.activity_participants
  for each row execute function trip.log_participant_change();

create function trip.log_photo_added()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  if new.activity_id is not null then
    insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
    values (new.activity_id, new.user_id, 'photo_added', new.caption);
  end if;
  return new;
end;
$$;

create trigger activity_photos_log
  after insert on trip.activity_photos
  for each row execute function trip.log_photo_added();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table trip.trips enable row level security;
alter table trip.user_profiles enable row level security;
alter table trip.activities enable row level security;
alter table trip.activity_participants enable row level security;
alter table trip.activity_photos enable row level security;
alter table trip.activity_changes enable row level security;
alter table trip.digests_daily enable row level security;

create function trip.is_admin()
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select coalesce((select is_admin from trip.user_profiles where id = auth.uid()), false);
$$;

-- trips: readable by any authenticated trip member; write reserved to admins
create policy trips_select on trip.trips for select to authenticated using (true);
create policy trips_write on trip.trips for all to authenticated
  using (trip.is_admin()) with check (trip.is_admin());

-- user_profiles: everyone can read; users edit their own row, admins edit any
create policy user_profiles_select on trip.user_profiles for select to authenticated using (true);
create policy user_profiles_insert on trip.user_profiles for insert to authenticated
  with check (id = auth.uid());
create policy user_profiles_update on trip.user_profiles for update to authenticated
  using (id = auth.uid() or trip.is_admin())
  with check (id = auth.uid() or trip.is_admin());

-- activities: everyone can read + create; edits scoped to creator (admin bypass)
create policy activities_select on trip.activities for select to authenticated using (true);
create policy activities_insert on trip.activities for insert to authenticated
  with check (
    created_by = auth.uid()
    and (source = 'user_added' or trip.is_admin())
  );
create policy activities_update on trip.activities for update to authenticated
  using (created_by = auth.uid() or trip.is_admin())
  with check (created_by = auth.uid() or trip.is_admin());
create policy activities_delete on trip.activities for delete to authenticated
  using (created_by = auth.uid() or trip.is_admin());

-- activity_participants: everyone can read; users manage only their own row
create policy activity_participants_select on trip.activity_participants
  for select to authenticated using (true);
create policy activity_participants_insert on trip.activity_participants
  for insert to authenticated with check (user_id = auth.uid());
create policy activity_participants_update on trip.activity_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy activity_participants_delete on trip.activity_participants
  for delete to authenticated using (user_id = auth.uid());

-- activity_photos: everyone can read; users manage only their own uploads
create policy activity_photos_select on trip.activity_photos for select to authenticated using (true);
create policy activity_photos_insert on trip.activity_photos for insert to authenticated
  with check (user_id = auth.uid());
create policy activity_photos_delete on trip.activity_photos for delete to authenticated
  using (user_id = auth.uid() or trip.is_admin());

-- activity_changes: read-only feed for everyone; rows are written by triggers (security definer)
create policy activity_changes_select on trip.activity_changes for select to authenticated using (true);

-- digests_daily: read-only for everyone; written by the digest Edge Function via service role
create policy digests_daily_select on trip.digests_daily for select to authenticated using (true);
