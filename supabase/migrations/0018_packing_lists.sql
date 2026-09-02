-- Packing lists: one shared "trip" list visible to every trip member, plus
-- any number of "private" lists visible only to their creator and invited
-- members. Items can be single or multi-quantity ("board games" — needs N,
-- or unlimited), track who's actually bringing each one (or been asked to),
-- and are soft-deleted so a "Deleted" section can restore them instead of
-- losing them outright.

create table trip.packing_lists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trip.trips (id) on delete cascade,
  kind text not null check (kind in ('trip', 'private')),
  name text,
  created_by uuid not null references trip.user_profiles (id),
  created_at timestamptz not null default now()
);

create index packing_lists_trip_id_idx on trip.packing_lists (trip_id);

-- Membership only matters for 'private' lists — a 'trip' list is visible to
-- every trip member regardless of rows here (see can_see_packing_list
-- below). Creating a private list auto-adds its creator as a member (see
-- the trigger below) so they aren't left unable to see their own list.
create table trip.packing_list_members (
  packing_list_id uuid not null references trip.packing_lists (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  added_by uuid not null references trip.user_profiles (id),
  created_at timestamptz not null default now(),
  primary key (packing_list_id, user_id)
);

create table trip.packing_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references trip.packing_lists (id) on delete cascade,
  name text not null,
  -- null = unlimited (pile on as many as you like, e.g. "snacks"); a number
  -- caps how many units are actually needed (e.g. 2 board games).
  quantity_needed int check (quantity_needed is null or quantity_needed > 0),
  created_by uuid not null references trip.user_profiles (id),
  created_at timestamptz not null default now(),
  -- Soft delete only — nothing in the app issues a hard DELETE against this
  -- table (no delete policy below), so a removed item can always be
  -- restored from the "Deleted" section instead of just vanishing.
  deleted_at timestamptz,
  deleted_by uuid references trip.user_profiles (id)
);

create index packing_items_list_id_idx on trip.packing_items (packing_list_id);

-- Who's bringing an item, and how many units. A 'confirmed' row is an
-- actual commitment (self-added, or accepted from a request). A
-- 'requested' row is someone *asking* another member to bring it — it
-- shows up to that member to confirm (flip their own row to 'confirmed')
-- or dismiss (delete it).
create table trip.packing_item_bringers (
  packing_item_id uuid not null references trip.packing_items (id) on delete cascade,
  user_id uuid not null references trip.user_profiles (id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'requested')),
  requested_by uuid references trip.user_profiles (id),
  created_at timestamptz not null default now(),
  primary key (packing_item_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Auto-membership
-- ---------------------------------------------------------------------------
create function trip.packing_list_add_creator()
returns trigger
language plpgsql
security definer
set search_path = trip, public
as $$
begin
  if new.kind = 'private' then
    insert into trip.packing_list_members (packing_list_id, user_id, added_by)
    values (new.id, new.created_by, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger packing_lists_add_creator
  after insert on trip.packing_lists
  for each row execute function trip.packing_list_add_creator();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table trip.packing_lists enable row level security;
alter table trip.packing_list_members enable row level security;
alter table trip.packing_items enable row level security;
alter table trip.packing_item_bringers enable row level security;

-- A 'trip' list is visible to everyone; a 'private' list only to its
-- members (or an admin, for support purposes).
create function trip.can_see_packing_list(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = trip, public
as $$
  select case
    when (select kind from trip.packing_lists where id = p_list_id) = 'trip' then true
    else
      exists (
        select 1 from trip.packing_list_members
        where packing_list_id = p_list_id and user_id = auth.uid()
      )
      or trip.is_admin()
  end;
$$;

create policy packing_lists_select on trip.packing_lists for select to authenticated
  using (kind = 'trip' or trip.can_see_packing_list(id));
create policy packing_lists_insert on trip.packing_lists for insert to authenticated
  with check (created_by = auth.uid());
create policy packing_lists_update on trip.packing_lists for update to authenticated
  using (trip.can_see_packing_list(id)) with check (trip.can_see_packing_list(id));
create policy packing_lists_delete on trip.packing_lists for delete to authenticated
  using (created_by = auth.uid() or trip.is_admin());

create policy packing_list_members_select on trip.packing_list_members for select to authenticated
  using (trip.can_see_packing_list(packing_list_id));
-- Any member who can already see a private list can invite another member —
-- the app confirms with the inviter before sending this, but that's a UI
-- courtesy, not something the database enforces.
create policy packing_list_members_insert on trip.packing_list_members for insert to authenticated
  with check (trip.can_see_packing_list(packing_list_id));
create policy packing_list_members_delete on trip.packing_list_members for delete to authenticated
  using (user_id = auth.uid() or trip.can_see_packing_list(packing_list_id));

create policy packing_items_select on trip.packing_items for select to authenticated
  using (trip.can_see_packing_list(packing_list_id));
create policy packing_items_insert on trip.packing_items for insert to authenticated
  with check (created_by = auth.uid() and trip.can_see_packing_list(packing_list_id));
-- No delete policy — see the soft-delete note on the table above.
create policy packing_items_update on trip.packing_items for update to authenticated
  using (trip.can_see_packing_list(packing_list_id))
  with check (trip.can_see_packing_list(packing_list_id));

create policy packing_item_bringers_select on trip.packing_item_bringers for select to authenticated
  using (exists (
    select 1 from trip.packing_items i
    where i.id = packing_item_id and trip.can_see_packing_list(i.packing_list_id)
  ));
create policy packing_item_bringers_insert on trip.packing_item_bringers for insert to authenticated
  with check (
    exists (
      select 1 from trip.packing_items i
      where i.id = packing_item_id and trip.can_see_packing_list(i.packing_list_id)
    )
    and (user_id = auth.uid() or requested_by = auth.uid())
  );
create policy packing_item_bringers_update on trip.packing_item_bringers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy packing_item_bringers_delete on trip.packing_item_bringers for delete to authenticated
  using (user_id = auth.uid() or requested_by = auth.uid());
