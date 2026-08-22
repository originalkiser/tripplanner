-- Let an activity's creator/editor "request" other trip members join it.
-- Requested people land in activity_participants with status 'invited'
-- until they accept (-> 'joined') or decline (row deleted).

alter table trip.activity_participants drop constraint if exists activity_participants_status_check;
alter table trip.activity_participants add constraint activity_participants_status_check
  check (status in ('joined', 'proposed_alt_time', 'invited'));

-- Inserting an 'invited' row for someone else is how a request gets sent;
-- everything else about a participant row still requires it to be your own.
drop policy if exists activity_participants_insert on trip.activity_participants;
create policy activity_participants_insert on trip.activity_participants
  for insert to authenticated with check (user_id = auth.uid() or status = 'invited');

-- Invites aren't a real "joined" action yet — they show up in the Home
-- notifications list instead, so skip the activity_changes/digest entry
-- for them (accepting one still logs normally, since the update lands on
-- status = 'joined').
create or replace function trip.log_participant_change()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  if new.status = 'invited' then
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
