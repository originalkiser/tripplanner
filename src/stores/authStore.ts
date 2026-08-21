import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type UserProfile = Database['trip']['Tables']['user_profiles']['Row']

interface AuthState {
  session: Session | null
  profile: UserProfile | null
  status: 'loading' | 'signed_out' | 'signed_in'
  /** last_seen_at as it was BEFORE this session bumped it to now — the "since you last visited" anchor. */
  previousLastSeenAt: string | null
  init: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  status: 'loading',
  previousLastSeenAt: null,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    await applySession(data.session, set)

    supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session, set)
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null, status: 'signed_out' })
  },

  refreshProfile: async () => {
    const session = get().session
    if (!session) return
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
    set({ profile: profile ?? null })
  },
}))

// Only bump last_seen_at once per browser session — onAuthStateChange also
// fires on token refresh, and we don't want each refresh to erase the
// "since you last visited" anchor.
let hasBumpedLastSeen = false

async function applySession(
  session: Session | null,
  set: (partial: Partial<AuthState>) => void,
) {
  if (!session) {
    set({ session: null, profile: null, status: 'signed_out' })
    return
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profile && !hasBumpedLastSeen) {
    hasBumpedLastSeen = true
    set({ previousLastSeenAt: profile.last_seen_at })
    await supabase
      .from('user_profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id)
  }

  set({ session, profile: profile ?? null, status: 'signed_in' })
}
