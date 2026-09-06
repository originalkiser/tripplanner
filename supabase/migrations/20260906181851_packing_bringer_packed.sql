-- Separate from the "confirmed to bring" status: a bringer can commit to an
-- item well before it's actually in their bag. Lets the list distinguish
-- "someone's got it covered" from "it's actually packed" so a group can
-- close an item out with confidence right before leaving.
alter table trip.packing_item_bringers add column packed boolean not null default false;
