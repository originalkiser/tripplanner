import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  ActivityCategory,
  ActivitySource,
  ActivityType,
  ParticipantStatus,
} from '../types/database'

export interface ActivityParticipant {
  user_id: string
  status: ParticipantStatus
  proposed_date: string | null
  proposed_time: string | null
  rating: number | null
  profile: { display_name: string; avatar_url: string | null } | null
}

export interface Activity {
  id: string
  trip_id: string
  type: ActivityType
  name: string
  description: string | null
  proposed_date: string | null
  proposed_time: string | null
  duration_minutes: number | null
  location_name: string | null
  location_lat: number | null
  location_lng: number | null
  location_place_id: string | null
  link_url: string | null
  rating_avg: number | null
  category: ActivityCategory
  source: ActivitySource
  color_tag: string | null
  created_by: string
  created_at: string
  updated_at: string
  creator: { display_name: string; avatar_url: string | null } | null
  participants: ActivityParticipant[]
}

export interface ActivityFields {
  type: ActivityType
  name: string
  description: string | null
  proposedDate: string | null
  proposedTime: string | null
  durationMinutes: number | null
  locationName: string | null
  locationLat: number | null
  locationLng: number | null
  locationPlaceId: string | null
  linkUrl: string | null
  category: ActivityCategory
}

const SELECT = `
  *,
  creator:user_profiles!created_by(display_name, avatar_url),
  participants:activity_participants(
    user_id, status, proposed_date, proposed_time, rating,
    profile:user_profiles!user_id(display_name, avatar_url)
  )
`

interface ActivitiesState {
  activities: Activity[]
  loading: boolean
  fetchActivities: () => Promise<void>
  createActivity: (
    input: ActivityFields & { source: ActivitySource; createdBy: string; initialRating: number | null },
  ) => Promise<{ error: string | null; activityId?: string }>
  updateActivity: (activityId: string, input: ActivityFields) => Promise<{ error: string | null }>
  joinActivity: (activityId: string, userId: string) => Promise<{ error: string | null }>
  proposeAltTime: (
    activityId: string,
    userId: string,
    date: string,
    time: string,
  ) => Promise<{ error: string | null }>
  rateActivity: (
    activityId: string,
    userId: string,
    rating: number,
  ) => Promise<{ error: string | null }>
  leaveActivity: (activityId: string, userId: string) => Promise<{ error: string | null }>
}

function toRow(input: ActivityFields) {
  return {
    type: input.type,
    name: input.name,
    description: input.description,
    proposed_date: input.proposedDate,
    proposed_time: input.proposedTime,
    duration_minutes: input.durationMinutes,
    location_name: input.locationName,
    location_lat: input.locationLat,
    location_lng: input.locationLng,
    location_place_id: input.locationPlaceId,
    link_url: input.linkUrl,
    category: input.category,
  }
}

export const useActivitiesStore = create<ActivitiesState>((set, get) => ({
  activities: [],
  loading: false,

  fetchActivities: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('activities')
      .select(SELECT)
      .order('proposed_date', { ascending: true, nullsFirst: false })
      .order('proposed_time', { ascending: true, nullsFirst: false })

    if (error) {
      console.error(error)
      set({ loading: false })
      return
    }
    set({ activities: (data ?? []) as unknown as Activity[], loading: false })
  },

  createActivity: async (input) => {
    const tripId = await getActiveTripId()
    if (!tripId) return { error: 'No active trip found.' }

    const { data: created, error } = await supabase
      .from('activities')
      .insert({
        trip_id: tripId,
        created_by: input.createdBy,
        source: input.source,
        ...toRow(input),
      })
      .select('id')
      .single()

    if (error || !created) return { error: error?.message ?? 'Create failed' }

    // Creator auto-joins with their own excitement rating.
    await supabase.from('activity_participants').insert({
      activity_id: created.id,
      user_id: input.createdBy,
      status: 'joined',
      rating: input.initialRating,
    })

    await get().fetchActivities()
    return { error: null, activityId: created.id }
  },

  updateActivity: async (activityId, input) => {
    const { error } = await supabase.from('activities').update(toRow(input)).eq('id', activityId)
    if (error) return { error: error.message }
    await get().fetchActivities()
    return { error: null }
  },

  joinActivity: async (activityId, userId) => {
    const { error } = await supabase.from('activity_participants').upsert({
      activity_id: activityId,
      user_id: userId,
      status: 'joined',
    })
    if (error) return { error: error.message }
    await get().fetchActivities()
    return { error: null }
  },

  proposeAltTime: async (activityId, userId, date, time) => {
    const { error } = await supabase.from('activity_participants').upsert({
      activity_id: activityId,
      user_id: userId,
      status: 'proposed_alt_time',
      proposed_date: date,
      proposed_time: time,
    })
    if (error) return { error: error.message }
    await get().fetchActivities()
    return { error: null }
  },

  rateActivity: async (activityId, userId, rating) => {
    const { error } = await supabase
      .from('activity_participants')
      .update({ rating })
      .eq('activity_id', activityId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchActivities()
    return { error: null }
  },

  leaveActivity: async (activityId, userId) => {
    const { error } = await supabase
      .from('activity_participants')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchActivities()
    return { error: null }
  },
}))

let cachedTripId: string | null = null
async function getActiveTripId(): Promise<string | null> {
  if (cachedTripId) return cachedTripId
  const { data } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
  cachedTripId = data?.id ?? null
  return cachedTripId
}
