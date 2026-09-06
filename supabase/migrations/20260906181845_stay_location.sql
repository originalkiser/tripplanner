-- Coordinates for where the group is staying, geocoded from the address on
-- save — lets other features (e.g. defaulting the nearest photo-location
-- match) compare distance without re-geocoding the address text.
alter table trip.stays add column lat double precision;
alter table trip.stays add column lng double precision;
