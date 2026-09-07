import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getCurrentTripId } from '../lib/currentTrip'
import type { ChangeType } from '../types/database'

export interface ChangeEntry {
  id: string
  change_type: ChangeType
  summary_text: string | null
  created_at: string
  user_id: string
  activity: { id: string; name: string; proposed_date: string | null } | null
  user: { display_name: string } | null
  // Only meaningfully populated for fetchDay's cross-trip mode — every
  // other query is already scoped to a single trip via RLS + the trip_id
  // filter, so there's nothing to disambiguate.
  trip: { id: string; name: string } | null
}

const SELECT = `
  id, change_type, summary_text, created_at, user_id,
  activity:activities(id, name, proposed_date),
  user:user_profiles(display_name)
`

// trip_id is a direct column now (see migration digest_photo_uploads_and_likes)
// rather than something only reachable by joining through activities, so a
// general trip-album photo upload/like (no activity_id) still carries one.
const SELECT_WITH_TRIP = `
  id, change_type, summary_text, created_at, user_id, trip_id,
  activity:activities(id, name, proposed_date),
  user:user_profiles(display_name),
  trip:trips(id, name)
`

interface DigestState {
  sinceLastVisit: ChangeEntry[]
  loadingSinceLastVisit: boolean
  dayEntries: ChangeEntry[]
  loadingDay: boolean
  byActivity: Record<string, ChangeEntry[]>
  fetchSinceLastVisit: (sinceIso: string | null) => Promise<void>
  // tripId null = across every trip the user belongs to (RLS alone scopes
  // it to those) rather than one specific trip — the daily digest's
  // "All trips" filter option.
  fetchDay: (date: string, tripId: string | null) => Promise<void>
  fetchForActivity: (activityId: string) => Promise<void>
}

export const useDigestStore = create<DigestState>((set) => ({
  sinceLastVisit: [],
  loadingSinceLastVisit: false,
  dayEntries: [],
  loadingDay: false,
  byActivity: {},

  fetchSinceLastVisit: async (sinceIso) => {
    if (!sinceIso) {
      set({ sinceLastVisit: [] })
      return
    }
    set({ loadingSinceLastVisit: true })
    const tripId = await getCurrentTripId()
    const { data, error } = await supabase
      .from('activity_changes')
      .select(SELECT_WITH_TRIP)
      .eq('trip_id', tripId ?? '')
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

  fetchDay: async (date, tripId) => {
    set({ loadingDay: true })
    const start = `${date}T00:00:00.000Z`
    const end = `${date}T23:59:59.999Z`
    let query = supabase
      .from('activity_changes')
      .select(SELECT_WITH_TRIP)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
    if (tripId) query = query.eq('trip_id', tripId)

    const { data, error } = await query

    if (error) {
      console.error(error)
      set({ loadingDay: false })
      return
    }
    set({ dayEntries: (data ?? []) as unknown as ChangeEntry[], loadingDay: false })
  },

  fetchForActivity: async (activityId) => {
    const { data, error } = await supabase
      .from('activity_changes')
      .select(SELECT)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }
    set((state) => ({
      byActivity: { ...state.byActivity, [activityId]: (data ?? []) as unknown as ChangeEntry[] },
    }))
  },
}))
