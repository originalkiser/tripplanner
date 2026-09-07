import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

// There's no sitewide "active trip" — different trips can be happening at
// the same time with different attendees, so no single trip should be
// everyone's default. Which trip a person is looking at is purely personal:
// an explicit choice (localStorage, keyed per user so a shared device
// doesn't mix people up) that falls back, when nothing's been chosen yet (or
// the chosen trip is no longer one they belong to), to whichever of their
// own trips is happening right now, or coming up next.
function storageKey(userId: string): string {
  return `trip:current:${userId}`
}

export interface TripDateRange {
  id: string
  start_date: string
  end_date: string
}

// Exported for the "Current trip" / "Upcoming trip" quick-switch buttons on
// My Trips, which resolve to a concrete trip the same way the fallback here
// does, then persist it like any other explicit choice.
export function pickCurrentTrip(trips: TripDateRange[]): TripDateRange | null {
  return pickByDate(trips, (t, today) => t.start_date <= today && today <= t.end_date, 'desc', 'start_date')
}

export function pickUpcomingTrip(trips: TripDateRange[]): TripDateRange | null {
  const today = new Date().toISOString().slice(0, 10)
  return pickByDate(trips.filter((t) => t.start_date > today), () => true, 'asc', 'start_date')
}

export function pickDefaultTrip(trips: TripDateRange[]): TripDateRange | null {
  if (trips.length === 0) return null
  return (
    pickCurrentTrip(trips) ??
    pickUpcomingTrip(trips) ??
    pickByDate(trips, () => true, 'desc', 'end_date') // most recently ended
  )
}

function pickByDate(
  trips: TripDateRange[],
  filter: (t: TripDateRange, today: string) => boolean,
  order: 'asc' | 'desc',
  field: 'start_date' | 'end_date',
): TripDateRange | null {
  const today = new Date().toISOString().slice(0, 10)
  const matches = trips.filter((t) => filter(t, today))
  if (matches.length === 0) return null
  matches.sort((a, b) => (order === 'asc' ? a[field].localeCompare(b[field]) : b[field].localeCompare(a[field])))
  return matches[0]
}

let cachedTripId: string | null | undefined // undefined = not yet resolved this page load

export async function getCurrentTripId(): Promise<string | null> {
  if (cachedTripId !== undefined) return cachedTripId

  const userId = useAuthStore.getState().profile?.id
  if (!userId) return null

  const chosen = localStorage.getItem(storageKey(userId))
  const { data: myTrips } = await supabase
    .from('trip_members')
    .select('trip:trips(id, start_date, end_date)')
    .eq('user_id', userId)
  const trips = ((myTrips ?? []) as unknown as { trip: TripDateRange | null }[])
    .map((row) => row.trip)
    .filter((t): t is TripDateRange => t != null)

  if (chosen && trips.some((t) => t.id === chosen)) {
    cachedTripId = chosen
    return cachedTripId
  }

  cachedTripId = pickDefaultTrip(trips)?.id ?? null
  return cachedTripId
}

// Every store that reads a trip id caches it for the page's lifetime (same
// pattern as this module), so switching which trip is "current" needs a full
// reload rather than trying to invalidate and re-fetch each one individually.
export function setCurrentTripId(tripId: string): void {
  const userId = useAuthStore.getState().profile?.id
  if (!userId) return
  localStorage.setItem(storageKey(userId), tripId)
  window.location.assign('/')
}

export function getStoredCurrentTripId(): string | null {
  const userId = useAuthStore.getState().profile?.id
  return userId ? localStorage.getItem(storageKey(userId)) : null
}
