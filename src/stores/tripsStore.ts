import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { HeroTheme } from '../components/HeroScene'

export interface TripMember {
  trip_id: string
  user_id: string
  role: 'admin' | 'member'
  arrival_at: string | null
  departure_at: string | null
  adults_count: number
  children_count: number
  allergies: string | null
  joined_at: string
  profile: { display_name: string; avatar_url: string | null } | null
}

export interface MyTrip {
  id: string
  name: string
  location: string | null
  start_date: string
  end_date: string
  hero_theme: HeroTheme
  created_by: string | null
  created_at: string
  myRole: 'admin' | 'member'
}

export interface StayInput {
  name: string | null
  address: string | null
  stayType: 'house' | 'apartment' | 'hotel' | 'other' | null
  checkInAt: string | null
  checkOutAt: string | null
}

export interface MyTripDetails {
  arrivalAt: string | null
  departureAt: string | null
  adultsCount: number
  childrenCount: number
  allergies: string | null
}

const MEMBER_SELECT = `
  trip_id, user_id, role, arrival_at, departure_at, adults_count, children_count, allergies, joined_at,
  profile:user_profiles!user_id(display_name, avatar_url)
`

interface TripsState {
  myTrips: MyTrip[]
  members: Record<string, TripMember[]>
  loading: boolean
  fetchMyTrips: (userId: string) => Promise<void>
  fetchMembers: (tripId: string) => Promise<void>
  createTrip: (input: {
    name: string
    location: string | null
    startDate: string
    endDate: string
    createdBy: string
    stay: StayInput
    inviteUserIds: string[]
    heroTheme: HeroTheme
  }) => Promise<{ error: string | null; tripId?: string }>
  updateTrip: (
    tripId: string,
    input: {
      name: string
      location: string | null
      startDate: string
      endDate: string
      stay: StayInput
      heroTheme: HeroTheme
    },
  ) => Promise<{ error: string | null }>
  setMemberRole: (tripId: string, userId: string, role: 'admin' | 'member') => Promise<{ error: string | null }>
  updateMyDetails: (tripId: string, userId: string, fields: MyTripDetails) => Promise<{ error: string | null }>
  addMembers: (tripId: string, userIds: string[]) => Promise<{ error: string | null }>
}

export const useTripsStore = create<TripsState>((set, get) => ({
  myTrips: [],
  members: {},
  loading: false,

  fetchMyTrips: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('trip_members')
      .select('role, trip:trips(id, name, location, start_date, end_date, hero_theme, created_by, created_at)')
      .eq('user_id', userId)
    if (error) {
      console.error(error)
      set({ loading: false })
      return
    }
    const trips = ((data ?? []) as unknown as { role: 'admin' | 'member'; trip: MyTrip | null }[])
      .filter((row) => row.trip)
      .map((row) => ({ ...row.trip!, myRole: row.role }))
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
    set({ myTrips: trips, loading: false })
  },

  fetchMembers: async (tripId) => {
    const { data, error } = await supabase.from('trip_members').select(MEMBER_SELECT).eq('trip_id', tripId)
    if (error) {
      console.error(error)
      return
    }
    set((state) => ({ members: { ...state.members, [tripId]: (data ?? []) as unknown as TripMember[] } }))
  },

  createTrip: async (input) => {
    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        name: input.name,
        location: input.location,
        start_date: input.startDate,
        end_date: input.endDate,
        created_by: input.createdBy,
        hero_theme: input.heroTheme,
      })
      .select('id')
      .single()
    if (error || !trip) return { error: error?.message ?? 'Create failed' }

    const { error: stayError } = await supabase.from('stays').insert({
      trip_id: trip.id,
      name: input.stay.name,
      address: input.stay.address,
      stay_type: input.stay.stayType,
      check_in_at: input.stay.checkInAt,
      check_out_at: input.stay.checkOutAt,
      updated_by: input.createdBy,
    })
    if (stayError) return { error: stayError.message, tripId: trip.id }

    if (input.inviteUserIds.length > 0) {
      const { error: membersError } = await supabase.from('trip_members').upsert(
        input.inviteUserIds.map((userId) => ({ trip_id: trip.id, user_id: userId, role: 'member' as const })),
        { onConflict: 'trip_id,user_id', ignoreDuplicates: true },
      )
      if (membersError) return { error: membersError.message, tripId: trip.id }
    }

    return { error: null, tripId: trip.id }
  },

  updateTrip: async (tripId, input) => {
    const { error } = await supabase
      .from('trips')
      .update({
        name: input.name,
        location: input.location,
        start_date: input.startDate,
        end_date: input.endDate,
        hero_theme: input.heroTheme,
      })
      .eq('id', tripId)
    if (error) return { error: error.message }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: stayError } = await supabase.from('stays').upsert({
      trip_id: tripId,
      name: input.stay.name,
      address: input.stay.address,
      stay_type: input.stay.stayType,
      check_in_at: input.stay.checkInAt,
      check_out_at: input.stay.checkOutAt,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    if (stayError) return { error: stayError.message }

    return { error: null }
  },

  setMemberRole: async (tripId, userId, role) => {
    const { error } = await supabase
      .from('trip_members')
      .update({ role })
      .eq('trip_id', tripId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchMembers(tripId)
    return { error: null }
  },

  updateMyDetails: async (tripId, userId, fields) => {
    const { error } = await supabase
      .from('trip_members')
      .update({
        arrival_at: fields.arrivalAt,
        departure_at: fields.departureAt,
        adults_count: fields.adultsCount,
        children_count: fields.childrenCount,
        allergies: fields.allergies,
      })
      .eq('trip_id', tripId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchMembers(tripId)
    return { error: null }
  },

  addMembers: async (tripId, userIds) => {
    if (userIds.length === 0) return { error: null }
    const { error } = await supabase.from('trip_members').upsert(
      userIds.map((userId) => ({ trip_id: tripId, user_id: userId, role: 'member' as const })),
      { onConflict: 'trip_id,user_id', ignoreDuplicates: true },
    )
    if (error) return { error: error.message }
    await get().fetchMembers(tripId)
    return { error: null }
  },
}))
