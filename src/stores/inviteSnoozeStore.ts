import { create } from 'zustand'

// "Decide later" on an activity join-request prompt hides it for 30
// minutes, then it prompts again next time the app is open — mirrors
// pollSnoozeStore's "remind me later", just with a shorter window since an
// invite typically needs a faster answer than a time poll. Stored
// client-side (per-device), not in Supabase.
const STORAGE_KEY = 'invite-snoozes'
const SNOOZE_MS = 30 * 60 * 1000

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// Keyed by `${activityId}:${userId}` since an invite is identified by that
// pair, not a single id of its own.
interface InviteSnoozeState {
  snoozedUntil: Record<string, number>
  snooze: (activityId: string, userId: string) => void
  isSnoozed: (activityId: string, userId: string) => boolean
}

function key(activityId: string, userId: string): string {
  return `${activityId}:${userId}`
}

export const useInviteSnoozeStore = create<InviteSnoozeState>((set, get) => ({
  snoozedUntil: load(),

  snooze: (activityId, userId) => {
    const next = { ...get().snoozedUntil, [key(activityId, userId)]: Date.now() + SNOOZE_MS }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ snoozedUntil: next })
  },

  isSnoozed: (activityId, userId) => {
    const until = get().snoozedUntil[key(activityId, userId)]
    return !!until && Date.now() < until
  },
}))
