import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { PackingBringerStatus, PackingListKind } from '../types/database'

export interface PackingBringer {
  user_id: string
  quantity: number
  status: PackingBringerStatus
  requested_by: string | null
  profile: { display_name: string; avatar_url: string | null } | null
}

export interface PackingItem {
  id: string
  packing_list_id: string
  name: string
  quantity_needed: number | null
  created_by: string
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
  creator: { display_name: string } | null
  bringers: PackingBringer[]
}

export interface PackingList {
  id: string
  trip_id: string
  kind: PackingListKind
  name: string | null
  created_by: string
  created_at: string
}

export interface PackingListMember {
  packing_list_id: string
  user_id: string
  added_by: string
  profile: { display_name: string; avatar_url: string | null } | null
}

const ITEM_SELECT = `
  id, packing_list_id, name, quantity_needed, created_by, created_at, deleted_at, deleted_by,
  creator:user_profiles!created_by(display_name),
  bringers:packing_item_bringers(
    user_id, quantity, status, requested_by,
    profile:user_profiles!user_id(display_name, avatar_url)
  )
`

interface PackingState {
  lists: PackingList[]
  items: Record<string, PackingItem[]>
  members: Record<string, PackingListMember[]>
  loading: boolean
  fetchLists: () => Promise<void>
  fetchItems: (listId: string) => Promise<void>
  fetchMembers: (listId: string) => Promise<void>
  createPrivateList: (name: string, createdBy: string) => Promise<{ error: string | null; listId?: string }>
  createItem: (
    listId: string,
    name: string,
    quantityNeeded: number | null,
    createdBy: string,
  ) => Promise<{ error: string | null }>
  softDeleteItem: (itemId: string, listId: string, userId: string) => Promise<{ error: string | null }>
  restoreItem: (itemId: string, listId: string) => Promise<{ error: string | null }>
  addBringer: (
    itemId: string,
    listId: string,
    userId: string,
    quantity: number,
  ) => Promise<{ error: string | null }>
  requestBringer: (
    itemId: string,
    listId: string,
    targetUserId: string,
    requestedBy: string,
    quantity: number,
  ) => Promise<{ error: string | null }>
  acceptBringRequest: (itemId: string, listId: string, userId: string) => Promise<{ error: string | null }>
  removeBringer: (itemId: string, listId: string, userId: string) => Promise<{ error: string | null }>
  addMembers: (
    listId: string,
    userIds: string[],
    addedBy: string,
  ) => Promise<{ error: string | null }>
  removeMember: (listId: string, userId: string) => Promise<{ error: string | null }>
}

export const usePackingStore = create<PackingState>((set, get) => ({
  lists: [],
  items: {},
  members: {},
  loading: false,

  fetchLists: async () => {
    set({ loading: true })
    // RLS already scopes this to the shared trip list plus whichever
    // private lists this user belongs to.
    const { data, error } = await supabase
      .from('packing_lists')
      .select('id, trip_id, kind, name, created_by, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      set({ loading: false })
      return
    }
    set({ lists: (data ?? []) as unknown as PackingList[], loading: false })
  },

  fetchItems: async (listId) => {
    const { data, error } = await supabase
      .from('packing_items')
      .select(ITEM_SELECT)
      .eq('packing_list_id', listId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }
    set((state) => ({ items: { ...state.items, [listId]: (data ?? []) as unknown as PackingItem[] } }))
  },

  fetchMembers: async (listId) => {
    const { data, error } = await supabase
      .from('packing_list_members')
      .select('packing_list_id, user_id, added_by, profile:user_profiles!user_id(display_name, avatar_url)')
      .eq('packing_list_id', listId)

    if (error) {
      console.error(error)
      return
    }
    set((state) => ({ members: { ...state.members, [listId]: (data ?? []) as unknown as PackingListMember[] } }))
  },

  createPrivateList: async (name, createdBy) => {
    const list = get().lists[0]
    const tripId = list?.trip_id ?? (await getActiveTripId())
    if (!tripId) return { error: 'No active trip found.' }

    const { data, error } = await supabase
      .from('packing_lists')
      .insert({ trip_id: tripId, kind: 'private', name, created_by: createdBy })
      .select('id')
      .single()

    if (error || !data) return { error: error?.message ?? 'Create failed' }
    await get().fetchLists()
    return { error: null, listId: data.id }
  },

  createItem: async (listId, name, quantityNeeded, createdBy) => {
    const { error } = await supabase
      .from('packing_items')
      .insert({ packing_list_id: listId, name, quantity_needed: quantityNeeded, created_by: createdBy })
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  softDeleteItem: async (itemId, listId, userId) => {
    const { error } = await supabase
      .from('packing_items')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', itemId)
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  restoreItem: async (itemId, listId) => {
    const { error } = await supabase
      .from('packing_items')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', itemId)
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  addBringer: async (itemId, listId, userId, quantity) => {
    const { error } = await supabase.from('packing_item_bringers').upsert({
      packing_item_id: itemId,
      user_id: userId,
      quantity,
      status: 'confirmed',
      requested_by: null,
    })
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  requestBringer: async (itemId, listId, targetUserId, requestedBy, quantity) => {
    const { error } = await supabase.from('packing_item_bringers').upsert({
      packing_item_id: itemId,
      user_id: targetUserId,
      quantity,
      status: 'requested',
      requested_by: requestedBy,
    })
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  acceptBringRequest: async (itemId, listId, userId) => {
    const { error } = await supabase
      .from('packing_item_bringers')
      .update({ status: 'confirmed' })
      .eq('packing_item_id', itemId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  removeBringer: async (itemId, listId, userId) => {
    const { error } = await supabase
      .from('packing_item_bringers')
      .delete()
      .eq('packing_item_id', itemId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchItems(listId)
    return { error: null }
  },

  addMembers: async (listId, userIds, addedBy) => {
    if (userIds.length === 0) return { error: null }
    const { error } = await supabase
      .from('packing_list_members')
      .upsert(
        userIds.map((userId) => ({ packing_list_id: listId, user_id: userId, added_by: addedBy })),
        { onConflict: 'packing_list_id,user_id', ignoreDuplicates: true },
      )
    if (error) return { error: error.message }
    await get().fetchMembers(listId)
    return { error: null }
  },

  removeMember: async (listId, userId) => {
    const { error } = await supabase
      .from('packing_list_members')
      .delete()
      .eq('packing_list_id', listId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchMembers(listId)
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
