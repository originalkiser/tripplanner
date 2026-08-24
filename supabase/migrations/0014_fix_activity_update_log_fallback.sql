-- auth.uid() is null outside a real authenticated request (direct SQL,
-- service-role calls, etc.). Since activity_changes.user_id is not-null,
-- that would make the trigger raise instead of just mis-attributing —
-- fall back to the activity's creator rather than hard-failing the edit.
create or replace function trip.log_activity_updated()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  new.updated_at := now();
  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (new.id, coalesce(auth.uid(), new.created_by), 'updated', new.name);
  return new;
end;
$$;
