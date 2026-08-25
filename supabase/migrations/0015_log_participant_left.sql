-- Track when someone leaves an activity, for the new per-activity History
-- section. Only log when they were actually 'joined' — declining an
-- invite or withdrawing a proposed-alt-time also deletes a participant
-- row, and "left" would be a misleading label for either of those.
alter table trip.activity_changes drop constraint if exists activity_changes_change_type_check;
alter table trip.activity_changes add constraint activity_changes_change_type_check
  check (change_type in ('created', 'updated', 'joined', 'left', 'proposed_time', 'photo_added', 'comment'));

create function trip.log_participant_left()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  if old.status = 'joined' then
    insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
    values (old.activity_id, old.user_id, 'left', null);
  end if;
  return old;
end;
$$;

create trigger activity_participants_log_delete
  after delete on trip.activity_participants
  for each row execute function trip.log_participant_left();
