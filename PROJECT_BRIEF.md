# Savannah/Tybee Trip App — Project Brief

Mobile-first trip planning web app for a group of 7 (3 couples + 1) traveling to
Savannah, GA and Tybee Island, GA, **Sept 4–7, 2026**, for a birthday trip. The
app lets the group propose activities/restaurants, "join" them (optionally
proposing a different time), see everything on a color-coded map, and stay
caught up via a per-user "since you last visited" digest and a daily digest.
Requires login; the roster is a closed list of pre-seeded/invited emails
(no public signup); beach-themed, phone-first UI.

## Tech stack

- React + TypeScript + Vite + Tailwind + Zustand
- Supabase (Postgres + Auth + Storage + Edge Functions + Realtime), RLS on every table
- Named schema: `trip` (single schema — no `core`/`platform` split needed at this size)
- Secrets via Supabase Vault + Edge Functions, never client-side env vars
- Fonts: Chakra Petch (headers) + DM Mono (data/timestamps)
- Location search + map: OpenStreetMap Nominatim (geocoding/search) + MapLibre GL JS
  (map rendering) — no Google Maps billing account needed. "Open in Maps" links are
  constructed URLs (`https://maps.google.com/?q=lat,lng`, `https://maps.apple.com/?q=lat,lng`)
- Routing/ETA lines: OpenRouteService (free API key, 2,000 req/day), key stored in
  Supabase Vault, called only from an Edge Function
- Photo storage: Supabase Storage bucket(s) on the existing Pro-tier project

Supabase project: **Trip Planner**, under the existing `github.com/originalkiser`
org (same Pro subscription).

## Post-launch redesign (nautical theme, navigation, photo tagging)

After the initial 9 phases shipped and the group started really using it, a
follow-up pass reworked several things:

- **Fixed broken avatars in production** — `<img src="/avatars/x.svg">` doesn't
  respect Vite's `base` path once deployed to a subpath; [lib/assetUrl.ts](src/lib/assetUrl.ts)
  resolves stored `avatar_url` values against `import.meta.env.BASE_URL` everywhere
  they're rendered.
- **Custom avatar photo upload** — alongside the 8 presets, `/profile` now lets
  anyone upload their own photo (compressed client-side, stored in `trip-photos`
  under `avatars/<user_id>/`, `avatar_type = 'custom'`).
- **Bottom nav grew to 6 tabs** with icons: List, Unplanned, Map, Album, Digest,
  Profile. List now shows **only** day-assigned activities; everything without a
  day (unscheduled or `imported_note`) moved to its own **Unplanned** tab
  ([UnplannedPage.tsx](src/features/activities/UnplannedPage.tsx)).
- **Trip Album redesign** — no longer tucked under Profile; it's a bottom-nav tab
  showing *every* photo from the trip in one chronological feed (by upload time —
  true EXIF "date taken" extraction was skipped as scope not worth it here),
  with per-photo activity/location tagging (re-assignable after upload) and
  people-tagging (`trip.photo_tags`, migration 0007).
- **Type editing** — the creator or an admin can reclassify an activity between
  Food / Activity / Food & Activity after the fact, from the expanded card.
- **Day color-coding** — each of the 4 trip days gets a halo color (teal / sand /
  ocean blue / coral) echoed as a ring around every card from that day.
- **Nautical theme** — palette now includes `--surface-2`, `--line`, `--text-dim`,
  `--savannah`/`--tybee`/`--coral` tokens; [HeroScene.tsx](src/components/HeroScene.tsx)
  renders an animated sky/water backdrop (glowing sun or moon, swaying palms,
  birds flying past, an occasional leaping dolphin) behind the top of every page,
  with day/night pure-CSS-swapped (`.scene-day`/`.scene-night`) to always match
  the active light/dark theme.

## Data model (schema: `trip`)

- `trip.trips` — id, name, start_date, end_date, is_active (lets a second trip
  exist later without a migration)
- `trip.user_profiles` — id (= auth.users.id), display_name, email, avatar_url, avatar_type
  ('preset'|'custom'), primary_color, secondary_color, is_admin, password_set,
  last_seen_at, created_at
- `trip.activities` — id, trip_id, type ('food'|'activity'|'food_and_activity'), name,
  description, proposed_date (nullable), proposed_time, location_name, location_lat/lng,
  location_place_id (nominatim osm_id), rating_avg, category ('savannah'|'tybee'),
  source ('user_added'|'imported_note'), created_by, created_at, updated_at, color_tag
- `trip.activity_participants` — activity_id, user_id, status ('joined'|'proposed_alt_time'),
  proposed_date, proposed_time, rating (1–5, personal), joined_at
- `trip.activity_photos` — id, activity_id (nullable = general trip album), user_id,
  storage_path, caption, created_at
- `trip.activity_changes` (digest source) — id, activity_id, user_id, change_type
  ('created'|'updated'|'joined'|'proposed_time'|'photo_added'|'comment'), summary_text, created_at
- `trip.digests_daily` — date, generated_summary (jsonb), created_at

RLS: all authenticated trip members read everything; everyone can create activities
(no admin gate); edits scoped to `created_by = auth.uid()` (admin bypass via
`is_admin`); participants edit only their own `activity_participants` row.
`source = 'imported_note'` rows can only be **created** by an admin, but are
otherwise ordinary activities once created.

Implemented across [supabase/migrations/](supabase/migrations/) 0001–0004.

## Auth model: claim-your-password, no OAuth

No Google/Apple sign-in (avoids needing OAuth dev app credentials). Instead:

- The trip roster is a closed set of emails — either pre-seeded via
  [scripts/seed-users.mjs](scripts/seed-users.mjs) or added later by **any**
  signed-in member through the "Add someone" form on `/people` (calls the
  `invite-user` Edge Function — no admin gate on this).
- A newly created account has `password_set = false` and an unknown random
  password. The **first** person to sign in with that email may enter *any*
  password they like — the login screen detects this via the
  `trip.check_login_email` RPC, routes to a "choose a password" step, and the
  `claim-account` Edge Function sets that password for real and flips
  `password_set` to `true`. From then on it's a normal password login.
- Admins can force this to happen again for someone (effectively "reset to
  null") via the `admin-reset-password` Edge Function — it sets an unknown
  password and flips `password_set` back to `false`, so their next login is a
  fresh claim with whatever password they choose.
- Everyone can edit their own name, avatar (8 preset SVGs in
  [public/avatars/](public/avatars/)), and password from `/profile` at any
  time. There's no real admin/user distinction except who can reset another
  person's password.

## Phase breakdown — all done

1. **Scaffold, auth, roster management** — Vite+React+TS+Tailwind, claim-your-password
   email login (see above), `trip.trips` table for future multi-trip support.
2. **Profile & theming** — avatar picker (8 preset beach SVGs), name + password
   editing from `/profile`, explicit light/system/dark toggle (persisted to
   `localStorage`, [src/lib/theme.ts](src/lib/theme.ts)), `last_seen_at` tracking.
   *Scope cut:* no custom avatar upload or per-user primary/secondary color
   pickers — the preset avatars plus the fixed beach palette covered the need;
   easy to add later in [ProfilePage.tsx](src/features/profile/ProfilePage.tsx).
3. **Activity creation modal** — [CreateActivityModal.tsx](src/features/activities/CreateActivityModal.tsx):
   type chips, date/time (optional/unscheduled), Nominatim location search +
   `MiniMap` confirm pin, description, 1–5 excitement rating (creator
   auto-joins with it), category auto-suggest via bounding box
   ([lib/geo.ts](src/lib/geo.ts)), admin-only "Add without a day" (imported_note) toggle.
4. **Activity list, join, propose-alt-time** — [ActivityListPage.tsx](src/features/activities/ActivityListPage.tsx):
   day-grouped list (Sept 4/5/6/7 + Unscheduled), "Imported from shared note"
   collapsible section, join/leave/propose-alt-time/rate actions on
   [ActivityCard.tsx](src/features/activities/ActivityCard.tsx).
5. **Color-coded map** — [MapPage.tsx](src/features/map/MapPage.tsx): MapLibre
   pins colored by category with food/activity icons, tap popover with
   Google/Apple Maps links, "Route today's stops" (day picker) and
   "Route between 2 pins" via OpenRouteService (`route` Edge Function),
   admin-only Settings paste-in for the ORS key
   ([set-integration-key](supabase/functions/set-integration-key/index.ts)),
   graceful "Routing isn't set up yet" fallback when no key is configured
   (true today — nobody's added a free ORS key yet).
6. **Digest system** — [DigestBanner.tsx](src/features/digest/DigestBanner.tsx)
   ("While you were away", driven by the previous `last_seen_at`) and
   [DigestPage.tsx](src/features/digest/DigestPage.tsx) (`/digest`, paginated
   by day), both reading `trip.activity_changes` (trigger-populated).
7. **Photo uploads** — [PhotoGallery.tsx](src/features/photos/PhotoGallery.tsx):
   per-activity (inside the expanded `ActivityCard`) + general
   [Trip Album](src/features/photos/TripAlbumPage.tsx) (`/album`), canvas-based
   client-side compression before upload
   ([lib/imageCompression.ts](src/lib/imageCompression.ts)), grid + lightbox.
   Storage: public `trip-photos` bucket, RLS scoped to authenticated
   upload / owner-or-admin delete (migration 0006).
8. **Beach theme & mobile polish** — full palette below, light/dark toggle,
   bottom tab nav (List/Map/Digest/Profile). MapLibre and the create-activity
   modal are lazy-loaded ([App.tsx](src/App.tsx),
   [ActivityListPage.tsx](src/features/activities/ActivityListPage.tsx)) so
   the initial bundle a phone downloads stays ~135KB gzipped instead of ~390KB.
9. **Seed data** — [scripts/seed-activities.mjs](scripts/seed-activities.mjs)
   geocoded and inserted all 42 shared-note items as `source = 'imported_note'`,
   admin-attributed; 30 have real coordinates (Nominatim doesn't have every
   small business as a POI — those 12 still show fine in the list, they just
   don't get a map pin). The Sunset Dolphin Cruise is pre-scheduled to
   Sat Sept 5, 7pm per the brief's note. Already run against the live project.

## Palette (light / dark)

| token | light | dark |
|---|---|---|
| `--bg` | `#FAF3E7` (sand) | `#0F2027` (deep ocean navy) |
| `--surface` | `#FFFFFF` | `#16323D` |
| `--primary` | `#1B7A8C` (teal) | `#4FC3D9` (bright teal) |
| `--secondary` | `#2D5D7B` (ocean blue) | `#7FB3D5` (light ocean blue) |
| `--accent` | `#E8A96B` (warm sand) | `#E8A96B` (same) |
| `--text` | `#1F2A2E` | `#EAF2F3` |

Category color-coding sits on top: Savannah pins in `--secondary`, Tybee pins
in `--primary`. Implemented as CSS variables in [src/index.css](src/index.css).

## Seed data

Merged from the original 4 lists plus a later addition; likely duplicates
(nicknames, near-identical spots) were folded into the existing entry rather
than added twice — see notes.

### Savannah — Food

The Grey, The Olde Pink House, Mrs. Wilkes' Dining Room, Crystal Beer Parlor,
The Collins Quarter, Repeal 33, Cotton & Rye, Treylor Park, The Pirates' House,
Common Restaurant, Lulu's Chocolate Bar, **The Vault**, **Screamin' Mimi's (pizza)**,
**Vic's on the River**

> Folded in as duplicates: "The Pirate House" → The Pirates' House; "Common (Brunch)" → Common Restaurant.

### Savannah — Things to Do

Forsyth Park, Historic District squares walking route, ghost/history walking
tour, River Street, Bonaventure Cemetery, Telfair Museums (Jepson Center /
Owens-Thomas House / Telfair Academy), Cathedral Basilica of St. John the
Baptist, Plant Riverside District, Wormsloe Historic Site, SCAD Museum of Art,
**Sunset Dolphin River Cruise**, **Savannah Bee Company**

> Folded in as duplicates: Forsyth Park, Bonaventure Cemetery (already listed); "River Walk area (shops, foods, drinks)" → River Street.
> Note: the Sunset Dolphin River Cruise was specifically flagged for **Saturday night**, i.e. Sept 5, 2026 — worth pre-scheduling to that day/time once it's added rather than leaving fully unscheduled, even though it seeds as an imported_note row like the rest.

### Tybee — Food

The Crab Shack, Fannie's on the Beach, Sundae Cafe, A-J's Dockside,
Pier 16 Seafood, Salt Island Fish and Beer, Sting Ray's Seafood, Rock House,
**Spanky's**, **The Breakfast Club**

> Folded in as duplicate: "Pier 16" → Pier 16 Seafood.

### Tybee — Things to Do

Tybee Island Light Station & Museum, North Beach, Fort Pulaski National
Monument, Tybee Island Marine Science Center, dolphin adventure boat tour,
Tybee Pier & Pavilion

> Folded in as duplicates: "Ze Lighthoose" → Tybee Island Light Station & Museum; "Marine Center" → Tybee Island Marine Science Center. No net-new items from the later addition.

## Resolved decisions

- Trip: Sept 4–7, 2026, four day groups plus "Unscheduled"/"Imported from shared note"
- Palette: sandy/teal/ocean-blue family with full light + dark mode
- Everyone has full posting access; every card shows who posted it
- Admin can add day-less items tagged "Imported from shared note"
- Supabase project: Trip Planner, same org as SB Net's Pro subscription

## Setup

Done, against the live **Trip Planner** Supabase project (`cjpgupcwprdjvebclsnm`,
`originalkiser` org):

- Migrations 0001–0006 applied (`supabase db push`):
  0001 schema, 0002 email-check RPC, 0003 password-claim flow, 0004 schema
  grants (see note below), 0005 `app_settings` for the ORS key, 0006 the
  `trip-photos` storage bucket + policies.
- `trip` schema exposed via the Data API, and `authenticated`/`service_role`
  granted base privileges on it — RLS is the real access-control layer, but
  Postgres also requires the underlying `GRANT`, and a custom schema (unlike
  `public`) gets none of that automatically. This was actually missing for a
  while (added in 0004) and silently blocked every authenticated query until
  caught during end-to-end testing.
- Edge Functions deployed: `claim-account`, `invite-user`, `admin-reset-password`,
  `set-integration-key`, `route`.
- Roster seeded via `scripts/seed-users.mjs` — mkiser97@gmail.com (admin) +
  5 members, all unclaimed (`password_set = false`), ready for each person's
  first real login (any password works the first time).
- Seed activities loaded via `scripts/seed-activities.mjs` (see Phase 9 above).
- `.env.local` has real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values.
- No OpenRouteService key has been added yet — the map's routing feature
  shows its "isn't set up yet" fallback until an admin pastes one in from
  `/map` (Route today's stops or Route between 2 pins → prompts for it).

To reproduce from scratch on a new project:

1. `supabase link --project-ref <ref>`, then `supabase db push`.
2. `supabase functions deploy claim-account && supabase functions deploy invite-user && supabase functions deploy admin-reset-password && supabase functions deploy set-integration-key && supabase functions deploy route`
3. `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-users.mjs`
   then `node scripts/seed-activities.mjs` with the same env vars
   (service role key, never the anon key — get it from Settings > API, don't commit it)
4. Copy `.env.example` to `.env.local`, fill in the anon key + URL from Settings > API.
