-- Seed the one shared "trip" packing list so the app always has something
-- to attach items to — it's a singleton per trip, not something a user
-- creates themselves (unlike private lists).
insert into trip.packing_lists (trip_id, kind, name, created_by)
select t.id, 'trip', 'Trip Packing List', (select id from trip.user_profiles where is_admin order by created_at limit 1)
from trip.trips t
where t.is_active
  and not exists (
    select 1 from trip.packing_lists p where p.trip_id = t.id and p.kind = 'trip'
  );
