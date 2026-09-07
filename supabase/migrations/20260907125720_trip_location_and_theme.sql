-- General area the trip is in (e.g. "Asheville, NC") as distinct from the
-- specific stay address in trip.stays. hero_theme is forward-compatible for
-- the mountain/city/amusement-park scenes planned as a follow-up — every
-- trip defaults to 'beach' (the only one actually illustrated today) and
-- the create-trip form doesn't expose the other options yet.
alter table trip.trips add column location text;
alter table trip.trips add column hero_theme text not null default 'beach'
  check (hero_theme in ('beach', 'mountain', 'city', 'amusement_park'));
