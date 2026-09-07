import { create } from 'zustand'

export type PhotoSortMode = 'uploaded-asc' | 'uploaded-desc' | 'taken-asc' | 'taken-desc'

const DEFAULT_SORT: PhotoSortMode = 'uploaded-asc'
const VALID_MODES: PhotoSortMode[] = ['uploaded-asc', 'uploaded-desc', 'taken-asc', 'taken-desc']

// Remembers the album's sort order per device, so it stays how someone last
// left it instead of resetting to oldest-first every time they open the
// page. Stored client-side (not in Supabase) — a per-device preference, same
// as the other small stores here.
const STORAGE_KEY = 'photo-sort-mode'

function load(): PhotoSortMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (VALID_MODES as string[]).includes(stored)) return stored as PhotoSortMode
  } catch {
    // Storage can be unavailable (private browsing, permissions) — fall
    // through to the default below.
  }
  return DEFAULT_SORT
}

interface PhotoSortState {
  sortMode: PhotoSortMode
  setSortMode: (mode: PhotoSortMode) => void
}

export const usePhotoSortStore = create<PhotoSortState>((set) => ({
  sortMode: load(),

  setSortMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Ignore — worst case the preference doesn't persist across sessions.
    }
    set({ sortMode: mode })
  },
}))
