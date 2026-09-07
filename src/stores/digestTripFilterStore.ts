import { create } from 'zustand'
import { useAuthStore } from './authStore'

// Which trip the Daily Digest is filtered to — null means "All trips".
// Remembered per device/user (not per trip, deliberately: it's a
// standalone preference about how you like to read the digest, independent
// of whichever trip you're currently viewing) so leaving and returning to
// the page keeps your last choice instead of resetting to "All trips"
// every time.
function storageKey(userId: string): string {
  return `digest:tripFilter:${userId}`
}

interface DigestTripFilterState {
  selectedTripId: string | null
  hydrated: boolean
  hydrate: () => void
  setSelectedTripId: (tripId: string | null) => void
}

export const useDigestTripFilterStore = create<DigestTripFilterState>((set) => ({
  selectedTripId: null,
  hydrated: false,

  hydrate: () => {
    const userId = useAuthStore.getState().profile?.id
    if (!userId) return
    const stored = localStorage.getItem(storageKey(userId))
    set({ selectedTripId: stored, hydrated: true })
  },

  setSelectedTripId: (tripId) => {
    const userId = useAuthStore.getState().profile?.id
    if (userId) {
      if (tripId) localStorage.setItem(storageKey(userId), tripId)
      else localStorage.removeItem(storageKey(userId))
    }
    set({ selectedTripId: tripId })
  },
}))
