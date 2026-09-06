-- Likes on trip/activity photos. Toggle is insert/delete of a row, not an
-- update — matches photo_tags' shape and RLS ("everyone has equal
-- standing").
create table trip.photo_likes (
  photo_id uuid not null references trip.activity_photos (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

alter table trip.photo_likes enable row level security;

create policy photo_likes_select on trip.photo_likes for select to authenticated using (true);
create policy photo_likes_insert on trip.photo_likes for insert to authenticated with check (true);
create policy photo_likes_delete on trip.photo_likes for delete to authenticated using (true);
