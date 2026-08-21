// One-time seed — geocodes the shared-note lists via Nominatim and inserts
// them as source='imported_note', unscheduled activities (except the
// Sunset Dolphin Cruise, which the brief flagged for Saturday night and gets
// pre-scheduled). Safe to re-run: skips any name that already exists.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/seed-activities.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon) first.')
  process.exit(1)
}

const ADMIN_EMAIL = 'mkiser97@gmail.com'

const SAVANNAH_FOOD = [
  'The Grey', 'The Olde Pink House', "Mrs. Wilkes' Dining Room", 'Crystal Beer Parlor',
  'The Collins Quarter', 'Repeal 33', 'Cotton & Rye', 'Treylor Park', "The Pirates' House",
  'Common Restaurant', "Lulu's Chocolate Bar", 'The Vault', "Screamin' Mimi's",
  "Vic's on the River",
]

const SAVANNAH_ACTIVITIES = [
  'Forsyth Park', 'Historic District squares walking route', 'ghost/history walking tour',
  'River Street', 'Bonaventure Cemetery', 'Telfair Museums', 'Cathedral Basilica of St. John the Baptist',
  'Plant Riverside District', 'Wormsloe Historic Site', 'SCAD Museum of Art',
  'Savannah Bee Company',
]

const TYBEE_FOOD = [
  'The Crab Shack', "Fannie's on the Beach", 'Sundae Cafe', "A-J's Dockside",
  'Pier 16 Seafood', 'Salt Island Fish and Beer', "Sting Ray's Seafood", 'Rock House',
  "Spanky's", 'The Breakfast Club',
]

const TYBEE_ACTIVITIES = [
  'Tybee Island Light Station & Museum', 'North Beach', 'Fort Pulaski National Monument',
  'Tybee Island Marine Science Center', 'dolphin adventure boat tour', 'Tybee Pier & Pavilion',
]

// Bounding boxes used both for the geocode viewbox hint and for the
// category auto-suggest logic the create-activity modal reuses (Phase 3).
const BOUNDS = {
  savannah: { minLat: 31.9, maxLat: 32.1, minLng: -81.2, maxLng: -81.0 },
  tybee: { minLat: 31.94, maxLat: 32.05, minLng: -80.87, maxLng: -80.82 },
}

const SPECIAL_SCHEDULE = {
  'Sunset Dolphin River Cruise': { proposed_date: '2026-09-05', proposed_time: '19:00' },
}

function rows() {
  const out = []
  for (const name of SAVANNAH_FOOD) out.push({ name, type: 'food', category: 'savannah' })
  for (const name of SAVANNAH_ACTIVITIES) out.push({ name, type: 'activity', category: 'savannah' })
  for (const name of TYBEE_FOOD) out.push({ name, type: 'food', category: 'tybee' })
  for (const name of TYBEE_ACTIVITIES) out.push({ name, type: 'activity', category: 'tybee' })
  out.push({ name: 'Sunset Dolphin River Cruise', type: 'activity', category: 'savannah' })
  return out
}

async function geocode(name, category) {
  const bounds = BOUNDS[category]
  const query = `${name}, ${category === 'savannah' ? 'Savannah' : 'Tybee Island'}, GA`
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')
  url.searchParams.set('viewbox', `${bounds.minLng},${bounds.maxLat},${bounds.maxLng},${bounds.minLat}`)
  url.searchParams.set('bounded', '0')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'TripPlannerApp/1.0 (personal trip-planning project)' },
  })
  if (!res.ok) return null
  const results = await res.json()
  if (!results.length) return null
  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    place_id: String(results[0].place_id ?? ''),
    display_name: results[0].display_name,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'trip' },
})

const { data: admin } = await adminClient
  .from('user_profiles')
  .select('id')
  .ilike('email', ADMIN_EMAIL)
  .maybeSingle()

if (!admin) {
  console.error(`Admin user ${ADMIN_EMAIL} not found — run seed-users.mjs first.`)
  process.exit(1)
}

const { data: trip } = await adminClient.from('trips').select('id').limit(1).maybeSingle()
if (!trip) {
  console.error('No row in trip.trips — did migration 0001 run?')
  process.exit(1)
}

let created = 0
let skipped = 0
let geocodeFailed = 0

for (const item of rows()) {
  const { data: existing } = await adminClient
    .from('activities')
    .select('id')
    .eq('name', item.name)
    .maybeSingle()

  if (existing) {
    console.log(`skip (exists): ${item.name}`)
    skipped++
    continue
  }

  const geo = await geocode(item.name, item.category)
  if (!geo) {
    console.warn(`  could not geocode: ${item.name} (inserting without coordinates)`)
    geocodeFailed++
  }

  const schedule = SPECIAL_SCHEDULE[item.name] ?? { proposed_date: null, proposed_time: null }

  const { error } = await adminClient.from('activities').insert({
    trip_id: trip.id,
    type: item.type,
    name: item.name,
    category: item.category,
    source: 'imported_note',
    proposed_date: schedule.proposed_date,
    proposed_time: schedule.proposed_time,
    location_name: geo?.display_name ?? null,
    location_lat: geo?.lat ?? null,
    location_lng: geo?.lng ?? null,
    location_place_id: geo?.place_id ?? null,
    created_by: admin.id,
  })

  if (error) {
    console.error(`FAILED: ${item.name} — ${error.message}`)
  } else {
    console.log(`created: ${item.name}${geo ? '' : ' (no coordinates)'}`)
    created++
  }

  // Nominatim usage policy: max 1 request/sec.
  await sleep(1100)
}

console.log(`\nDone. Created ${created}, skipped ${skipped} already-existing, ${geocodeFailed} without coordinates.`)
