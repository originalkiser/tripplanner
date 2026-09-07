import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTripsStore } from '../../stores/tripsStore'
import { getCurrentTripId } from '../../lib/currentTrip'
import { resolveAssetUrl } from '../../lib/assetUrl'
import { PageHeader } from '../../components/layout/PageHeader'
import type { Database } from '../../types/database'

type Profile = Database['trip']['Tables']['user_profiles']['Row']
type Member = Profile & { tripRole: 'admin' | 'member' }

export function PeoplePage() {
  const isAdmin = useAuthStore((s) => s.profile?.is_admin ?? false)
  const addMembers = useTripsStore((s) => s.addMembers)
  const [tripId, setTripId] = useState<string | null>(null)
  const [tripName, setTripName] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const [resettingId, setResettingId] = useState<string | null>(null)

  async function loadMembers(forTripId: string) {
    setLoadingMembers(true)
    const { data } = await supabase
      .from('trip_members')
      .select('role, profile:user_profiles!user_id(*)')
      .eq('trip_id', forTripId)
    const rows = ((data ?? []) as unknown as { role: 'admin' | 'member'; profile: Profile | null }[])
      .filter((row) => row.profile)
      .map((row) => ({ ...row.profile!, tripRole: row.role }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
    setMembers(rows)
    setLoadingMembers(false)
  }

  useEffect(() => {
    void (async () => {
      const currentTripId = await getCurrentTripId()
      setTripId(currentTripId)
      if (!currentTripId) {
        setLoadingMembers(false)
        return
      }
      const { data: trip } = await supabase.from('trips').select('name').eq('id', currentTripId).maybeSingle()
      setTripName(trip?.name ?? null)
      await loadMembers(currentTripId)
    })()
  }, [])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!tripId) return
    setInviting(true)
    setInviteStatus(null)

    const { data: sessionData } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; userId: string }>('invite-user', {
      body: { email: email.trim(), displayName: displayName.trim() || undefined },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    })

    if (error || !data) {
      setInviting(false)
      setInviteStatus(`Error: ${error?.message ?? 'Invite failed'}`)
      return
    }

    const { error: memberError } = await addMembers(tripId, [data.userId])
    setInviting(false)
    if (memberError) {
      setInviteStatus(`Error: ${memberError}`)
      return
    }
    setInviteStatus(`Added ${email} to the trip. They can sign in with that email and any password.`)
    setEmail('')
    setDisplayName('')
    void loadMembers(tripId)
  }

  async function resetPassword(member: Member) {
    if (!confirm(`Reset ${member.display_name}'s password? They'll need to sign in again with their email and a new password.`)) {
      return
    }
    setResettingId(member.id)
    const { data: sessionData } = await supabase.auth.getSession()
    const { error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId: member.id },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    })
    setResettingId(null)
    if (error) {
      alert(`Error: ${error.message}`)
      return
    }
    if (tripId) void loadMembers(tripId)
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-8">
      <PageHeader title="Trip Members" backTo="/profile" backLabel="Profile" />

      <section className="card-shadow mb-6 mt-4 rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-lg font-medium">Add someone</h2>
        <form onSubmit={invite} className="flex flex-col gap-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            placeholder="Name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <button
            type="submit"
            disabled={inviting || !tripId}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {inviting ? 'Adding…' : 'Add to trip'}
          </button>
        </form>
        {inviteStatus && <p className="mt-3 text-sm">{inviteStatus}</p>}
      </section>

      <section className="card-shadow rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-lg font-medium">Everyone on the trip{tripName ? ` – ${tripName}` : ''}</h2>
        {loadingMembers && <p className="text-sm opacity-70">Loading…</p>}
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              {member.avatar_url ? (
                <img
                  src={resolveAssetUrl(member.avatar_url) ?? undefined}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-secondary/20" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {member.display_name}
                  {member.tripRole === 'admin' && (
                    <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                      admin
                    </span>
                  )}
                </p>
                <p className="font-data text-xs opacity-60">{member.email}</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void resetPassword(member)}
                  disabled={resettingId === member.id}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {resettingId === member.id ? 'Resetting…' : 'Reset password'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
