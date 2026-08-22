import { create } from 'zustand'

// "Remind me later" on a poll notification card just hides that poll's
// popup for a while — it doesn't count as a response, so the poll still
// counts toward the pending badge/notifications list. Stored client-side
// (not in Supabase) since it's a per-device "stop bugging me" preference,
// not something that needs to sync across a person's devices.
const STORAGE_KEY = 'poll-snoozes'
const SNOOZE_MS = 3 * 60 * 60 * 1000

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

interface SnoozeState {
  snoozedUntil: Record<string, number>
  snooze: (pollId: string) => void
  isSnoozed: (pollId: string) => boolean
}

export const usePollSnoozeStore = create<SnoozeState>((set, get) => ({
  snoozedUntil: load(),

  snooze: (pollId) => {
    const next = { ...get().snoozedUntil, [pollId]: Date.now() + SNOOZE_MS }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ snoozedUntil: next })
  },

  isSnoozed: (pollId) => {
    const until = get().snoozedUntil[pollId]
    return !!until && Date.now() < until
  },
}))
