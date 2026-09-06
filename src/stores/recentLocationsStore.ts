import { create } from 'zustand'

export interface RecentLocation {
  name: string
  lat: number | null
  lng: number | null
}

// Locations actually picked/saved through the photo tagging UI, most
// recent first — deliberately NOT derived from photos' own timestamps
// (taken_at/created_at), which ranked by when the *photo* was taken/
// uploaded rather than when its location was *tagged*. That meant
// correcting an old photo's location never bubbled to the top, while a
// stale/wrong tag on a more-recently-taken photo kept outranking it.
// Stored client-side (not in Supabase) — a per-device convenience, not
// something that needs to sync across a person's devices.
const STORAGE_KEY = 'recent-photo-locations'
const MAX_RECENT = 8

function load(): RecentLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface RecentLocationsState {
  recent: RecentLocation[]
  record: (location: RecentLocation) => void
}

export const useRecentLocationsStore = create<RecentLocationsState>((set, get) => ({
  recent: load(),

  record: (location) => {
    if (!location.name) return
    const next = [location, ...get().recent.filter((r) => r.name !== location.name)].slice(0, MAX_RECENT)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore — worst case the list just doesn't persist across sessions.
    }
    set({ recent: next })
  },
}))
