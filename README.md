# Trip Planner

Mobile-first trip planning app for Sept 4–7, 2026. See
[PROJECT_BRIEF.md](PROJECT_BRIEF.md) for the full spec, data model, phase
breakdown, palette, and seed data.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL/anon key — see PROJECT_BRIEF.md "Setup"
npm run dev
```

Then open `http://localhost:5173`. The Supabase project is already live and
seeded (see PROJECT_BRIEF.md), so a real `.env.local` gets you a fully
working login.

## Status

All 9 phases from [PROJECT_BRIEF.md](PROJECT_BRIEF.md) are built and running
against the live Supabase project: claim-your-password login (no OAuth),
profile editing, activity creation/join/propose-time, the color-coded map
with OpenRouteService routing (fallback UI until a key is added), the digest
system, photo uploads, and the seeded shared-note list. See "Phase breakdown"
and "Setup" in the brief for what's done and the couple of intentional scope
cuts (custom avatar upload, per-user color pickers — see Phase 2 there).

Nobody's logged in for real yet — all 6 roster accounts are unclaimed, ready
for each person's first visit.
