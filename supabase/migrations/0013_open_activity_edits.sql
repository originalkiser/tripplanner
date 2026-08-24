-- Any trip member can edit any activity now, not just its creator/admin —
-- matches the trust model already used everywhere else in this schema.
drop policy if exists activities_update on trip.activities;
create policy activities_update on trip.activities for update to authenticated
  using (true) with check (true);

-- The updated-activity change log was always attributing the edit to the
-- activity's original creator (new.created_by) instead of whoever actually
-- made the edit — harmless while only the creator could edit, but wrong
-- now that anyone can. auth.uid() is the actual authenticated caller.
create or replace function trip.log_activity_updated()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  new.updated_at := now();
  insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
  values (new.id, auth.uid(), 'updated', new.name);
  return new;
end;
$$;
