-- 0016 used `changed || 'literal'` to append a single text value to a
-- text[] — Postgres treats that as array-literal concatenation, not
-- element append, and raises "malformed array literal" the moment any of
-- those branches actually run. That made every edit that touched
-- description/type/time/duration/location/link fail outright. Fixed with
-- array_append(), the unambiguous way to add one element to an array.
create or replace function trip.log_activity_updated()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
declare
  changed text[] := array[]::text[];
begin
  new.updated_at := now();

  if old.name is distinct from new.name then changed := array_append(changed, 'renamed'); end if;
  if old.type is distinct from new.type then changed := array_append(changed, 'changed type'); end if;
  if old.description is distinct from new.description then changed := array_append(changed, 'updated description'); end if;
  if old.proposed_date is distinct from new.proposed_date or old.proposed_time is distinct from new.proposed_time
    then changed := array_append(changed, 'changed time'); end if;
  if old.duration_minutes is distinct from new.duration_minutes then changed := array_append(changed, 'changed duration'); end if;
  if old.location_name is distinct from new.location_name or old.location_lat is distinct from new.location_lat
    then changed := array_append(changed, 'updated location'); end if;
  if old.link_url is distinct from new.link_url then changed := array_append(changed, 'updated link'); end if;

  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (
    new.id,
    coalesce(auth.uid(), new.created_by),
    'updated',
    case when array_length(changed, 1) > 0 then array_to_string(changed, ', ') else null end
  );
  return new;
end;
$$;
