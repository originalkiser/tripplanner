-- Trip Album redesign: photos can be re-linked to an activity after upload,
-- and tagged with who's in them.

create policy activity_photos_update on trip.activity_photos
  for update to authenticated
  using (user_id = auth.uid() or trip.is_admin())
  with check (user_id = auth.uid() or trip.is_admin());

create table trip.photo_tags (
  photo_id uuid not null references trip.activity_photos (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  tagged_by uuid not null references trip.user_profiles (id),
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

alter table trip.photo_tags enable row level security;

create policy photo_tags_select on trip.photo_tags for select to authenticated using (true);

create policy photo_tags_insert on trip.photo_tags for insert to authenticated with check (true);

create policy photo_tags_delete on trip.photo_tags for delete to authenticated
  using (user_id = auth.uid() or tagged_by = auth.uid() or trip.is_admin());
