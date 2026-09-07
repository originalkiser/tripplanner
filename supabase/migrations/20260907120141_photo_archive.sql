-- Photo archiving: once the trip's photos have been exported/backed up
-- externally (e.g. to a shared Google Drive folder), an admin can record
-- that link and re-compress the stored originals down to small previews to
-- free up Supabase storage for future trips. All existing photo metadata
-- (location, taken_at, activity link, captions, tags, likes) is left
-- untouched — only the stored image bytes themselves get replaced.
alter table trip.trips add column photo_archive_link text;
alter table trip.activity_photos add column archived_at timestamptz;

-- Re-archiving (upsert onto the same storage path) needs an UPDATE policy on
-- storage.objects, which trip-photos never had (uploads only ever inserted
-- new objects before now) — without this, the re-compressed upload would be
-- silently rejected by RLS.
create policy trip_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'trip-photos' and (owner = auth.uid() or trip.is_admin()))
  with check (bucket_id = 'trip-photos' and (owner = auth.uid() or trip.is_admin()));
