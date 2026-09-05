import { create } from 'zustand'

// Tracks when the current device last viewed the trip album, so the Home
// notification for "someone else added photos" can clear itself once
// they've actually looked. Stored client-side (not in Supabase) — a
// per-device "have I seen this" marker, not something that needs to sync
// across a person's devices, same as the poll/invite snoozes.
const STORAGE_KEY = 'photos-last-seen-at'

function load(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch {
    // Storage can be unavailable (private browsing, permissions) — fall
    // through to the default below.
  }
  // No history yet: treat "now" as the baseline so a brand-new device
  // doesn't get flooded with every photo ever uploaded to the trip.
  return new Date().toISOString()
}

interface PhotoSeenState {
  lastSeenAt: string
  markSeen: () => void
}

export const usePhotoSeenStore = create<PhotoSeenState>((set) => ({
  lastSeenAt: load(),

  markSeen: () => {
    const now = new Date().toISOString()
    try {
      localStorage.setItem(STORAGE_KEY, now)
    } catch {
      // Ignore — worst case the notification reappears next session.
    }
    set({ lastSeenAt: now })
  },
}))
