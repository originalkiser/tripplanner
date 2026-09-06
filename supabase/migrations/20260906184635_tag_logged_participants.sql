-- Tagging someone on a logged visit (see tagParticipants in the app) inserts
-- or updates their row straight to status 'joined', for a *different*
-- user_id than the one performing the action. The existing insert/update
-- policies only ever allowed writing your own row (plus the 'invited'
-- carve-out for future-activity invites) — that silently rejected every
-- tag, leaving only the creator recorded as an attendee. Extend both
-- policies with a matching carve-out, scoped to logged activities only, so
-- ordinary (non-logged) activities still can't have someone else's
-- participation set without their own action or an invite.
create function trip.is_logged_activity(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select exists (
    select 1 from trip.activities where id = p_activity_id and source = 'logged'
  );
$$;

drop policy if exists activity_participants_insert on trip.activity_participants;
create policy activity_participants_insert on trip.activity_participants
  for insert to authenticated with check (
    user_id = auth.uid()
    or status = 'invited'
    or (status = 'joined' and trip.is_logged_activity(activity_id))
  );

drop policy if exists activity_participants_update on trip.activity_participants;
create policy activity_participants_update on trip.activity_participants
  for update to authenticated
  using (user_id = auth.uid() or trip.is_logged_activity(activity_id))
  with check (
    user_id = auth.uid()
    or (status = 'joined' and trip.is_logged_activity(activity_id))
  );
