-- Postgres requires an explicit GRANT in addition to RLS policies — RLS only
-- narrows access that's already granted at the SQL level, it doesn't
-- substitute for it. Custom schemas (unlike `public`) get none of this for
-- free, and this was missing since 0001: every authenticated and
-- service-role query against trip.* has been failing with "permission
-- denied for schema trip" the whole time, it just hadn't been exercised
-- end-to-end until now. RLS policies (already in place from 0001) remain
-- the real access control layer here.

grant usage on schema trip to authenticated, service_role;

grant select, insert, update, delete on all tables in schema trip to authenticated;
grant select, insert, update, delete on all tables in schema trip to service_role;

grant usage, select on all sequences in schema trip to authenticated, service_role;

alter default privileges in schema trip
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema trip
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema trip
  grant usage, select on sequences to authenticated, service_role;
