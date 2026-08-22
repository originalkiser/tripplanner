-- Time polls on an activity: a set of proposed date/time options (plus an
-- open "propose your own" option), everyone votes for one option or
-- "not interested". A new "other" proposal gets logged into
-- activity_changes so it surfaces in the existing digest/banner system —
-- that's the "notification" mechanism here, no separate push infra.

create table trip.activity_polls (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references trip.activities (id) on delete cascade,
  created_by uuid not null references trip.user_profiles (id),
  created_at timestamptz not null default now()
);

create table trip.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references trip.activity_polls (id) on delete cascade,
  proposed_date date,
  proposed_time time,
  is_other boolean not null default false,
  proposed_by uuid references trip.user_profiles (id),
  created_at timestamptz not null default now()
);

create table trip.poll_votes (
  poll_id uuid not null references trip.activity_polls (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  option_id uuid references trip.poll_options (id) on delete cascade,
  not_interested boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table trip.activity_polls enable row level security;
alter table trip.poll_options enable row level security;
alter table trip.poll_votes enable row level security;

create policy activity_polls_select on trip.activity_polls for select to authenticated using (true);
create policy activity_polls_insert on trip.activity_polls for insert to authenticated
  with check (created_by = auth.uid());
create policy activity_polls_delete on trip.activity_polls for delete to authenticated
  using (created_by = auth.uid() or trip.is_admin());

create policy poll_options_select on trip.poll_options for select to authenticated using (true);
create policy poll_options_insert on trip.poll_options for insert to authenticated with check (true);

create policy poll_votes_select on trip.poll_votes for select to authenticated using (true);
create policy poll_votes_insert on trip.poll_votes for insert to authenticated
  with check (user_id = auth.uid());
create policy poll_votes_update on trip.poll_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy poll_votes_delete on trip.poll_votes for delete to authenticated
  using (user_id = auth.uid());

create function trip.log_other_option_proposed()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
declare
  v_activity_id uuid;
begin
  if new.is_other and new.proposed_by is not null then
    select activity_id into v_activity_id from trip.activity_polls where id = new.poll_id;
    insert into trip.activity_changes (activity_id, user_id, change_type, summary_text)
    values (v_activity_id, new.proposed_by, 'proposed_time', 'proposed a new poll time');
  end if;
  return new;
end;
$$;

create trigger poll_options_log_other
  after insert on trip.poll_options
  for each row execute function trip.log_other_option_proposed();
