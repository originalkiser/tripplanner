import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

// Which trip a person is currently viewing is separate from which trip is
// sitewide-"active" (see trip.trips.is_active / tripsStore.activateTrip):
// activating a trip changes everyone's default, but anyone can independently
// browse any trip they belong to — most usefully, an old trip after the
// group has moved on to planning a new one — without disrupting what
// everyone else sees. The choice is per-device (localStorage, keyed by user
// id so a shared device doesn't mix people up) and falls back to the
// sitewide-active trip whenever nothing's chosen, or the chosen trip is no
// longer one the user belongs to.
function storageKey(userId: string): string {
  return `trip:current:${userId}`
}

let cachedTripId: string | null | undefined // undefined = not yet resolved this page load

export async function getCurrentTripId(): Promise<string | null> {
  if (cachedTripId !== undefined) return cachedTripId

  const userId = useAuthStore.getState().profile?.id
  const chosen = userId ? localStorage.getItem(storageKey(userId)) : null

  if (userId && chosen) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('trip_id', chosen)
      .eq('user_id', userId)
      .maybeSingle()
    if (membership) {
      cachedTripId = chosen
      return cachedTripId
    }
  }

  const { data: active } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
  cachedTripId = active?.id ?? null
  return cachedTripId
}

// Every store that reads a trip id caches it for the page's lifetime (same
// pattern as this module), so switching which trip is "current" needs a full
// reload rather than trying to invalidate and re-fetch each one individually.
export function setCurrentTripId(tripId: string | null): void {
  const userId = useAuthStore.getState().profile?.id
  if (!userId) return
  if (tripId) localStorage.setItem(storageKey(userId), tripId)
  else localStorage.removeItem(storageKey(userId))
  window.location.assign('/')
}

export function getStoredCurrentTripId(): string | null {
  const userId = useAuthStore.getState().profile?.id
  return userId ? localStorage.getItem(storageKey(userId)) : null
}
