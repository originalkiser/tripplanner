-- Where a photo was taken — auto-filled from EXIF GPS (reverse-geocoded to
-- a name) on new uploads when available, or set/edited manually. All
-- nullable: most photos will have neither.
alter table trip.activity_photos add column location_name text;
alter table trip.activity_photos add column location_lat double precision;
alter table trip.activity_photos add column location_lng double precision;
