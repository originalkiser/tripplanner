import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { HeroTheme } from '../components/HeroScene'

export interface TripMember {
  trip_id: string
  user_id: string
  role: 'admin' | 'member'
  arrival_date: string | null
  departure_date: string | null
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
  is_active: boolean
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
  arrivalDate: string | null
  departureDate: string | null
  adultsCount: number
  childrenCount: number
  allergies: string | null
}

const MEMBER_SELECT = `
  trip_id, user_id, role, arrival_date, departure_date, adults_count, children_count, allergies, joined_at,
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
  setMemberRole: (tripId: string, userId: string, role: 'admin' | 'member') => Promise<{ error: string | null }>
  updateMyDetails: (tripId: string, userId: string, fields: MyTripDetails) => Promise<{ error: string | null }>
  addMembers: (tripId: string, userIds: string[]) => Promise<{ error: string | null }>
  // Deactivates whatever trip is currently active and activates this one —
  // the rest of the app (Home, Plans, Packing, Album, …) only ever shows
  // the single is_active trip, so this is what actually makes a created
  // trip "the" trip everyone sees, not just a row that exists. Requires
  // being an admin of both trips (or the legacy global admin flag) since
  // it touches both rows.
  activateTrip: (tripId: string) => Promise<{ error: string | null }>
}

export const useTripsStore = create<TripsState>((set, get) => ({
  myTrips: [],
  members: {},
  loading: false,

  fetchMyTrips: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('trip_members')
      .select('role, trip:trips(id, name, location, start_date, end_date, is_active, created_by, created_at)')
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
      // New trips start inactive — the rest of the app (Home, Plans, Packing,
      // Album, …) still only ever looks up the single is_active=true trip,
      // so a second simultaneously-active one would make those lookups
      // ambiguous. Switching which trip is "live" is a separate step.
      .insert({
        name: input.name,
        location: input.location,
        start_date: input.startDate,
        end_date: input.endDate,
        created_by: input.createdBy,
        is_active: false,
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
        arrival_date: fields.arrivalDate,
        departure_date: fields.departureDate,
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

  activateTrip: async (tripId) => {
    const { data: current } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
    if (current && current.id !== tripId) {
      const { error: deactivateError } = await supabase
        .from('trips')
        .update({ is_active: false })
        .eq('id', current.id)
      if (deactivateError) return { error: deactivateError.message }
    }
    const { error } = await supabase.from('trips').update({ is_active: true }).eq('id', tripId)
    if (error) return { error: error.message }
    return { error: null }
  },
}))
