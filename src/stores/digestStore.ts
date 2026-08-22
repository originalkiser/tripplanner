import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { ChangeType } from '../types/database'

export interface ChangeEntry {
  id: string
  change_type: ChangeType
  summary_text: string | null
  created_at: string
  activity: { id: string; name: string; proposed_date: string | null } | null
  user: { display_name: string } | null
}

const SELECT = `
  id, change_type, summary_text, created_at,
  activity:activities(id, name, proposed_date),
  user:user_profiles(display_name)
`

export function activityHref(activity: { id: string; proposed_date: string | null } | null): string | null {
  if (!activity) return null
  return `${activity.proposed_date ? '/' : '/unplanned'}?activity=${activity.id}`
}

interface DigestState {
  sinceLastVisit: ChangeEntry[]
  loadingSinceLastVisit: boolean
  dayEntries: ChangeEntry[]
  loadingDay: boolean
  fetchSinceLastVisit: (sinceIso: string | null) => Promise<void>
  fetchDay: (date: string) => Promise<void>
}

export const useDigestStore = create<DigestState>((set) => ({
  sinceLastVisit: [],
  loadingSinceLastVisit: false,
  dayEntries: [],
  loadingDay: false,

  fetchSinceLastVisit: async (sinceIso) => {
    if (!sinceIso) {
      set({ sinceLastVisit: [] })
      return
    }
    set({ loadingSinceLastVisit: true })
    const { data, error } = await supabase
      .from('activity_changes')
      .select(SELECT)
      .gt('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error(error)
      set({ loadingSinceLastVisit: false })
      return
    }
    set({ sinceLastVisit: (data ?? []) as unknown as ChangeEntry[], loadingSinceLastVisit: false })
  },

  fetchDay: async (date) => {
    set({ loadingDay: true })
    const start = `${date}T00:00:00.000Z`
    const end = `${date}T23:59:59.999Z`
    const { data, error } = await supabase
      .from('activity_changes')
      .select(SELECT)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      set({ loadingDay: false })
      return
    }
    set({ dayEntries: (data ?? []) as unknown as ChangeEntry[], loadingDay: false })
  },
}))
