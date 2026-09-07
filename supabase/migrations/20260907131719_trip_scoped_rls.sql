-- Multi-trip foundation, phase 2: hard-isolate the tables that previously
-- assumed "there's only one trip, everyone authenticated is on it" (almost
-- every select policy here was just `using (true)`). Every one of these
-- now requires trip.is_trip_member(<that row's trip>) in addition to
-- whatever ownership rule already applied — a second trip's activities,
-- photos, packing lists, wifi info, polls, and stay details are no longer
-- visible to someone who isn't a trip_members row on that trip.
--
-- Two tables (activity_photos, digests_daily) had no trip_id at all —
-- activity_photos.activity_id is nullable (album photos), and
-- digests_daily was keyed only by date. Both get trip_id added with a
-- DEFAULT resolving to the current active trip, so existing app code that
-- doesn't explicitly set trip_id (until its own deploy lands) keeps
-- working without a gap. (Postgres column defaults can't contain a bare
-- subquery, hence the wrapper function.)
create function trip.current_active_trip_id()
returns uuid
language sql
stable
security definer
set search_path = trip, public
as $$
  select id from trip.trips where is_active = true limit 1;
$$;

-- ---------------------------------------------------------------------------
-- activity_photos: add trip_id
-- ---------------------------------------------------------------------------
alter table trip.activity_photos add column trip_id uuid references trip.trips (id);
alter table trip.activity_photos alter column trip_id set default trip.current_active_trip_id();

update trip.activity_photos ap
set trip_id = coalesce(
  (select a.trip_id from trip.activities a where a.id = ap.activity_id),
  trip.current_active_trip_id()
)
where trip_id is null;

alter table trip.activity_photos alter column trip_id set not null;
create index activity_photos_trip_id_idx on trip.activity_photos (trip_id);

-- ---------------------------------------------------------------------------
-- digests_daily: add trip_id, repoint primary key
-- ---------------------------------------------------------------------------
alter table trip.digests_daily add column trip_id uuid references trip.trips (id);
alter table trip.digests_daily alter column trip_id set default trip.current_active_trip_id();

update trip.digests_daily
set trip_id = trip.current_active_trip_id()
where trip_id is null;

alter table trip.digests_daily alter column trip_id set not null;
alter table trip.digests_daily drop constraint digests_daily_pkey;
alter table trip.digests_daily add primary key (trip_id, date);

-- ---------------------------------------------------------------------------
-- Helper functions: resolve a row's trip_id through each join chain
-- ---------------------------------------------------------------------------
create function trip.activity_trip_id(p_activity_id uuid)
returns uuid
language sql
stable
security definer
set search_path = trip, public
as $$
  select trip_id from trip.activities where id = p_activity_id;
$$;

create function trip.photo_trip_id(p_photo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = trip, public
as $$
  select trip_id from trip.activity_photos where id = p_photo_id;
$$;

create function trip.poll_trip_id(p_poll_id uuid)
returns uuid
language sql
stable
security definer
set search_path = trip, public
as $$
  select trip.activity_trip_id(activity_id) from trip.activity_polls where id = p_poll_id;
$$;

create function trip.poll_option_trip_id(p_option_id uuid)
returns uuid
language sql
stable
security definer
set search_path = trip, public
as $$
  select trip.poll_trip_id(poll_id) from trip.poll_options where id = p_option_id;
$$;

-- can_see_packing_list already gates every packing_items/packing_list_members/
-- packing_item_bringers policy that matters (via joins) — folding the trip
-- check in here propagates it everywhere at once instead of touching each
-- of those policies individually.
create or replace function trip.can_see_packing_list(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select
    trip.is_trip_member((select trip_id from trip.packing_lists where id = p_list_id))
    and case
      when (select kind from trip.packing_lists where id = p_list_id) = 'trip' then true
      else
        exists (
          select 1 from trip.packing_list_members
          where packing_list_id = p_list_id and user_id = auth.uid()
        )
        or trip.is_admin()
    end;
$$;

-- ---------------------------------------------------------------------------
-- activities (trip_id direct)
-- ---------------------------------------------------------------------------
drop policy activities_select on trip.activities;
create policy activities_select on trip.activities for select to authenticated
  using (trip.is_trip_member(trip_id));

drop policy activities_insert on trip.activities;
create policy activities_insert on trip.activities for insert to authenticated
  with check (
    trip.is_trip_member(trip_id)
    and created_by = auth.uid()
    and (source in ('user_added', 'logged') or trip.is_trip_admin(trip_id))
  );

-- Was "using (true) with check (true)" — anyone could edit any activity
-- regardless of trip. Keep that "everyone has equal standing" model, just
-- scoped to people actually on the trip.
drop policy activities_update on trip.activities;
create policy activities_update on trip.activities for update to authenticated
  using (trip.is_trip_member(trip_id)) with check (trip.is_trip_member(trip_id));

drop policy activities_delete on trip.activities;
create policy activities_delete on trip.activities for delete to authenticated
  using (trip.is_trip_member(trip_id) and (created_by = auth.uid() or trip.is_trip_admin(trip_id)));

-- ---------------------------------------------------------------------------
-- activity_participants (via activity_id)
-- ---------------------------------------------------------------------------
drop policy activity_participants_select on trip.activity_participants;
create policy activity_participants_select on trip.activity_participants for select to authenticated
  using (trip.is_trip_member(trip.activity_trip_id(activity_id)));

drop policy activity_participants_insert on trip.activity_participants;
create policy activity_participants_insert on trip.activity_participants for insert to authenticated
  with check (
    trip.is_trip_member(trip.activity_trip_id(activity_id))
    and (
      user_id = auth.uid()
      or status = 'invited'
      or (status = 'joined' and trip.is_logged_activity(activity_id))
    )
  );

drop policy activity_participants_update on trip.activity_participants;
create policy activity_participants_update on trip.activity_participants for update to authenticated
  using (trip.is_trip_member(trip.activity_trip_id(activity_id)) and (user_id = auth.uid() or trip.is_logged_activity(activity_id)))
  with check (
    trip.is_trip_member(trip.activity_trip_id(activity_id))
    and (user_id = auth.uid() or (status = 'joined' and trip.is_logged_activity(activity_id)))
  );

drop policy activity_participants_delete on trip.activity_participants;
create policy activity_participants_delete on trip.activity_participants for delete to authenticated
  using (trip.is_trip_member(trip.activity_trip_id(activity_id)) and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- activity_photos (trip_id direct now)
-- ---------------------------------------------------------------------------
drop policy activity_photos_select on trip.activity_photos;
create policy activity_photos_select on trip.activity_photos for select to authenticated
  using (trip.is_trip_member(trip_id));

drop policy activity_photos_insert on trip.activity_photos;
create policy activity_photos_insert on trip.activity_photos for insert to authenticated
  with check (trip.is_trip_member(trip_id) and user_id = auth.uid());

drop policy activity_photos_update on trip.activity_photos;
create policy activity_photos_update on trip.activity_photos for update to authenticated
  using (trip.is_trip_member(trip_id) and (user_id = auth.uid() or trip.is_trip_admin(trip_id)))
  with check (trip.is_trip_member(trip_id) and (user_id = auth.uid() or trip.is_trip_admin(trip_id)));

drop policy activity_photos_delete on trip.activity_photos;
create policy activity_photos_delete on trip.activity_photos for delete to authenticated
  using (trip.is_trip_member(trip_id) and (user_id = auth.uid() or trip.is_trip_admin(trip_id)));

-- ---------------------------------------------------------------------------
-- photo_tags / photo_likes (via photo_id)
-- ---------------------------------------------------------------------------
drop policy photo_tags_select on trip.photo_tags;
create policy photo_tags_select on trip.photo_tags for select to authenticated
  using (trip.is_trip_member(trip.photo_trip_id(photo_id)));

drop policy photo_tags_insert on trip.photo_tags;
create policy photo_tags_insert on trip.photo_tags for insert to authenticated
  with check (trip.is_trip_member(trip.photo_trip_id(photo_id)));

drop policy photo_tags_delete on trip.photo_tags;
create policy photo_tags_delete on trip.photo_tags for delete to authenticated
  using (
    trip.is_trip_member(trip.photo_trip_id(photo_id))
    and (user_id = auth.uid() or tagged_by = auth.uid() or trip.is_admin())
  );

drop policy photo_likes_select on trip.photo_likes;
create policy photo_likes_select on trip.photo_likes for select to authenticated
  using (trip.is_trip_member(trip.photo_trip_id(photo_id)));

drop policy photo_likes_insert on trip.photo_likes;
create policy photo_likes_insert on trip.photo_likes for insert to authenticated
  with check (trip.is_trip_member(trip.photo_trip_id(photo_id)));

drop policy photo_likes_delete on trip.photo_likes;
create policy photo_likes_delete on trip.photo_likes for delete to authenticated
  using (trip.is_trip_member(trip.photo_trip_id(photo_id)));

-- ---------------------------------------------------------------------------
-- activity_polls / poll_options / poll_votes
-- ---------------------------------------------------------------------------
drop policy activity_polls_select on trip.activity_polls;
create policy activity_polls_select on trip.activity_polls for select to authenticated
  using (trip.is_trip_member(trip.activity_trip_id(activity_id)));

drop policy activity_polls_insert on trip.activity_polls;
create policy activity_polls_insert on trip.activity_polls for insert to authenticated
  with check (trip.is_trip_member(trip.activity_trip_id(activity_id)) and created_by = auth.uid());

drop policy activity_polls_delete on trip.activity_polls;
create policy activity_polls_delete on trip.activity_polls for delete to authenticated
  using (
    trip.is_trip_member(trip.activity_trip_id(activity_id))
    and (created_by = auth.uid() or trip.is_admin())
  );

drop policy poll_options_select on trip.poll_options;
create policy poll_options_select on trip.poll_options for select to authenticated
  using (trip.is_trip_member(trip.poll_trip_id(poll_id)));

drop policy poll_options_insert on trip.poll_options;
create policy poll_options_insert on trip.poll_options for insert to authenticated
  with check (trip.is_trip_member(trip.poll_trip_id(poll_id)));

drop policy poll_votes_select on trip.poll_votes;
create policy poll_votes_select on trip.poll_votes for select to authenticated
  using (trip.is_trip_member(trip.poll_option_trip_id(option_id)));

drop policy poll_votes_insert on trip.poll_votes;
create policy poll_votes_insert on trip.poll_votes for insert to authenticated
  with check (trip.is_trip_member(trip.poll_option_trip_id(option_id)) and user_id = auth.uid());

drop policy poll_votes_update on trip.poll_votes;
create policy poll_votes_update on trip.poll_votes for update to authenticated
  using (trip.is_trip_member(trip.poll_option_trip_id(option_id)) and user_id = auth.uid())
  with check (trip.is_trip_member(trip.poll_option_trip_id(option_id)) and user_id = auth.uid());

drop policy poll_votes_delete on trip.poll_votes;
create policy poll_votes_delete on trip.poll_votes for delete to authenticated
  using (trip.is_trip_member(trip.poll_option_trip_id(option_id)) and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- activity_changes (read-only feed; writes are via security-definer trigger)
-- ---------------------------------------------------------------------------
drop policy activity_changes_select on trip.activity_changes;
create policy activity_changes_select on trip.activity_changes for select to authenticated
  using (trip.is_trip_member(trip.activity_trip_id(activity_id)));

-- ---------------------------------------------------------------------------
-- digests_daily (trip_id direct now)
-- ---------------------------------------------------------------------------
drop policy digests_daily_select on trip.digests_daily;
create policy digests_daily_select on trip.digests_daily for select to authenticated
  using (trip.is_trip_member(trip_id));

-- ---------------------------------------------------------------------------
-- packing_lists (trip_id direct — can_see_packing_list above now covers
-- items/list_members/bringers too)
-- ---------------------------------------------------------------------------
drop policy packing_lists_select on trip.packing_lists;
create policy packing_lists_select on trip.packing_lists for select to authenticated
  using (trip.is_trip_member(trip_id) and (kind = 'trip' or trip.can_see_packing_list(id)));

drop policy packing_lists_insert on trip.packing_lists;
create policy packing_lists_insert on trip.packing_lists for insert to authenticated
  with check (trip.is_trip_member(trip_id) and created_by = auth.uid());

drop policy packing_lists_delete on trip.packing_lists;
create policy packing_lists_delete on trip.packing_lists for delete to authenticated
  using (trip.is_trip_member(trip_id) and (created_by = auth.uid() or trip.is_trip_admin(trip_id)));

-- ---------------------------------------------------------------------------
-- stays / wifi_networks (trip_id direct primary key)
-- ---------------------------------------------------------------------------
drop policy stays_select on trip.stays;
create policy stays_select on trip.stays for select to authenticated using (trip.is_trip_member(trip_id));
drop policy stays_insert on trip.stays;
create policy stays_insert on trip.stays for insert to authenticated with check (trip.is_trip_member(trip_id));
drop policy stays_update on trip.stays;
create policy stays_update on trip.stays for update to authenticated
  using (trip.is_trip_member(trip_id)) with check (trip.is_trip_member(trip_id));

drop policy wifi_networks_select on trip.wifi_networks;
create policy wifi_networks_select on trip.wifi_networks for select to authenticated
  using (trip.is_trip_member(trip_id));
drop policy wifi_networks_insert on trip.wifi_networks;
create policy wifi_networks_insert on trip.wifi_networks for insert to authenticated
  with check (trip.is_trip_member(trip_id));
drop policy wifi_networks_update on trip.wifi_networks;
create policy wifi_networks_update on trip.wifi_networks for update to authenticated
  using (trip.is_trip_member(trip_id)) with check (trip.is_trip_member(trip_id));
