import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface PollOption {
  id: string
  proposed_date: string | null
  proposed_time: string | null
  is_other: boolean
  proposed_by: string | null
}

export interface PollVote {
  poll_id: string
  user_id: string
  option_id: string | null
  not_interested: boolean
  profile: { display_name: string } | null
}

export interface Poll {
  id: string
  activity_id: string
  created_by: string
  activity: { id: string; name: string } | null
  options: PollOption[]
  votes: PollVote[]
}

const SELECT = `
  id, activity_id, created_by,
  activity:activities(id, name),
  options:poll_options(id, proposed_date, proposed_time, is_other, proposed_by),
  votes:poll_votes(poll_id, user_id, option_id, not_interested, profile:user_profiles!user_id(display_name))
`

interface PollsState {
  byActivity: Record<string, Poll | undefined>
  all: Poll[]
  fetchForActivity: (activityId: string) => Promise<void>
  fetchAllForUser: (userId: string) => Promise<void>
  vote: (pollId: string, userId: string, optionId: string) => Promise<{ error: string | null }>
  voteNotInterested: (pollId: string, userId: string) => Promise<{ error: string | null }>
  proposeOther: (
    pollId: string,
    userId: string,
    date: string,
    time: string,
  ) => Promise<{ error: string | null }>
}

export const usePollsStore = create<PollsState>((set, get) => ({
  byActivity: {},
  all: [],

  fetchForActivity: async (activityId) => {
    const { data, error } = await supabase
      .from('activity_polls')
      .select(SELECT)
      .eq('activity_id', activityId)
      .maybeSingle()
    if (error) {
      console.error(error)
      return
    }
    set((state) => ({
      byActivity: { ...state.byActivity, [activityId]: (data ?? undefined) as unknown as Poll | undefined },
    }))
  },

  fetchAllForUser: async () => {
    const { data, error } = await supabase.from('activity_polls').select(SELECT)
    if (error) {
      console.error(error)
      return
    }
    set({ all: (data ?? []) as unknown as Poll[] })
  },

  vote: async (pollId, userId, optionId) => {
    const { error } = await supabase
      .from('poll_votes')
      .upsert({ poll_id: pollId, user_id: userId, option_id: optionId, not_interested: false })
    if (error) return { error: error.message }
    const poll = [...get().all, ...Object.values(get().byActivity)].find((p) => p?.id === pollId)
    if (poll?.activity_id) await get().fetchForActivity(poll.activity_id)
    await get().fetchAllForUser(userId)
    return { error: null }
  },

  voteNotInterested: async (pollId, userId) => {
    const { error } = await supabase
      .from('poll_votes')
      .upsert({ poll_id: pollId, user_id: userId, option_id: null, not_interested: true })
    if (error) return { error: error.message }
    const poll = [...get().all, ...Object.values(get().byActivity)].find((p) => p?.id === pollId)
    if (poll?.activity_id) await get().fetchForActivity(poll.activity_id)
    await get().fetchAllForUser(userId)
    return { error: null }
  },

  proposeOther: async (pollId, userId, date, time) => {
    const { data: option, error } = await supabase
      .from('poll_options')
      .insert({
        poll_id: pollId,
        proposed_date: date,
        proposed_time: time,
        is_other: true,
        proposed_by: userId,
      })
      .select('id')
      .single()
    if (error || !option) return { error: error?.message ?? 'Could not add option' }

    await supabase
      .from('poll_votes')
      .upsert({ poll_id: pollId, user_id: userId, option_id: option.id, not_interested: false })

    const poll = [...get().all, ...Object.values(get().byActivity)].find((p) => p?.id === pollId)
    if (poll?.activity_id) await get().fetchForActivity(poll.activity_id)
    await get().fetchAllForUser(userId)
    return { error: null }
  },
}))
