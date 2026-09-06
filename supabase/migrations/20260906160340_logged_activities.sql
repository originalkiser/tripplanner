-- "Log a visit" quick-add: a third activity source alongside user_added
-- (planned ahead) and imported_note (bulk-imported ideas) — something
-- someone's recording after already doing it, dated today by default, with
-- none of the scheduling/poll/invite trappings of a planned activity.
alter table trip.activities drop constraint if exists activities_source_check;
alter table trip.activities add constraint activities_source_check
  check (source in ('user_added', 'imported_note', 'logged'));

-- The insert policy only ever allowed 'user_added' for non-admins (plus
-- 'imported_note' for admins doing a bulk import) — regular members need to
-- be able to insert 'logged' rows too.
drop policy if exists activities_insert on trip.activities;
create policy activities_insert on trip.activities for insert to authenticated
  with check (
    created_by = auth.uid()
    and (source in ('user_added', 'logged') or trip.is_admin())
  );
