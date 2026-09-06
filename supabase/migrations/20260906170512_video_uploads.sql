-- Trip photos are about to include videos too — the bucket had no explicit
-- file_size_limit (falling back to the project's global default, typically
-- too small for phone-recorded video). MIME types were already
-- unrestricted (null = no restriction), so nothing needed there.
update storage.buckets set file_size_limit = 524288000 where id = 'trip-photos';
