import { create } from 'zustand'
import { useEffect } from 'react'
import { supabase } from './supabase'
import { getCurrentTripId } from './currentTrip'

interface TripNameState {
  name: string | null
  loaded: boolean
  fetch: () => Promise<void>
}

// Shared across every PageHeader instance so switching trips (which
// reloads the whole app, see currentTrip.ts) only costs one lookup instead
// of each page's header re-fetching the same trip name independently.
export const useTripNameStore = create<TripNameState>((set, get) => ({
  name: null,
  loaded: false,
  fetch: async () => {
    if (get().loaded) return
    const tripId = await getCurrentTripId()
    if (!tripId) {
      set({ name: null, loaded: true })
      return
    }
    const { data } = await supabase.from('trips').select('name').eq('id', tripId).maybeSingle()
    set({ name: data?.name ?? null, loaded: true })
  },
}))

export function useCurrentTripName(): string | null {
  const name = useTripNameStore((s) => s.name)
  const loaded = useTripNameStore((s) => s.loaded)
  const fetchName = useTripNameStore((s) => s.fetch)
  useEffect(() => {
    if (!loaded) void fetchName()
  }, [loaded, fetchName])
  return name
}
