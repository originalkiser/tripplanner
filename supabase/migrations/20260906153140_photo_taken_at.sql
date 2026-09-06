-- The photo's actual capture time (from EXIF, when the upload flow could
-- read it), distinct from created_at (when it was uploaded to the trip).
-- Existing rows have no EXIF on file (photos are re-encoded to strip EXIF
-- before upload, and the original bytes aren't kept), so they backfill to
-- their upload time — the best available substitute.
alter table trip.activity_photos add column taken_at timestamptz;
update trip.activity_photos set taken_at = created_at where taken_at is null;
alter table trip.activity_photos alter column taken_at set not null;
alter table trip.activity_photos alter column taken_at set default now();
