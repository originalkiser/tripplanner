-- Field-level detail for "updated" digest entries (was just the activity's
-- name, giving no clue what actually changed), and a new 'invited' change
-- type so sending a join request shows up in the digest/history too —
-- previously it logged nothing at all.
alter table trip.activity_changes drop constraint if exists activity_changes_change_type_check;
alter table trip.activity_changes add constraint activity_changes_change_type_check
  check (change_type in ('created', 'updated', 'joined', 'left', 'invited', 'proposed_time', 'photo_added', 'comment'));

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

-- Invites are logged too now (attributed to whoever sent the request, not
-- the invitee — auth.uid() is the caller), so "requested people join"
-- shows up in the digest/history instead of nothing.
create or replace function trip.log_participant_change()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  if new.status = 'invited' then
    insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
    values (new.activity_id, coalesce(auth.uid(), new.user_id), 'invited', null);
    return new;
  end if;
  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (
    new.activity_id,
    new.user_id,
    case when new.status = 'proposed_alt_time' then 'proposed_time' else 'joined' end,
    null
  );
  return new;
end;
$$;
