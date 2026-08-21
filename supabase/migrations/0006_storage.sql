-- Trip photo storage. Bucket is public (simple direct URLs for a private,
-- trusted 7-person group — no sensitive content), but only authenticated
-- trip members can upload, and only the uploader or an admin can delete.

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

create policy trip_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trip-photos');

create policy trip_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-photos');

create policy trip_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trip-photos'
    and (owner = auth.uid() or trip.is_admin())
  );
