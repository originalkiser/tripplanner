import { useEffect, useState } from 'react'
import { useTripsStore, type StayInput } from '../../stores/tripsStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

const STAY_TYPES: { value: NonNullable<StayInput['stayType']>; label: string }[] = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'other', label: 'Other' },
]

interface PendingEmailInvite {
  email: string
  name: string
}

export function CreateTripModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const createTrip = useTripsStore((s) => s.createTrip)

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [stayName, setStayName] = useState('')
  const [stayType, setStayType] = useState<StayInput['stayType']>(null)
  const [stayAddress, setStayAddress] = useState('')
  const [checkInAt, setCheckInAt] = useState('')
  const [checkOutAt, setCheckOutAt] = useState('')

  const [knownUsers, setKnownUsers] = useState<Member[]>([])
  const [selectedKnownIds, setSelectedKnownIds] = useState<Set<string>>(new Set())

  const [emailInvites, setEmailInvites] = useState<PendingEmailInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')

  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
      .then(({ data }) => setKnownUsers((data ?? []).filter((m) => m.id !== profile?.id)))
  }, [profile?.id])

  function toggleKnown(userId: string) {
    setSelectedKnownIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function addEmailInvite() {
    const email = inviteEmail.trim()
    if (!email) return
    if (emailInvites.some((i) => i.email.toLowerCase() === email.toLowerCase())) return
    setEmailInvites((prev) => [...prev, { email, name: inviteName.trim() }])
    setInviteEmail('')
    setInviteName('')
  }

  function removeEmailInvite(email: string) {
    setEmailInvites((prev) => prev.filter((i) => i.email !== email))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !name.trim() || !startDate || !endDate) return
    setSaving(true)
    setError(null)

    // New accounts for anyone not already known — same claim-your-password
    // flow as the existing Trip Members "Add someone" (no email actually
    // sent; they sign in with that email and any password the first time).
    // An email that already has an account elsewhere just gets that
    // account added to this trip instead of erroring — someone inviting by
    // email has no way to know whether that person is already a known user.
    const newUserIds: string[] = []
    if (emailInvites.length > 0) {
      setProgress('Setting up new accounts…')
      const { data: sessionData } = await supabase.auth.getSession()
      for (const invite of emailInvites) {
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .ilike('email', invite.email)
          .maybeSingle()
        if (existing) {
          newUserIds.push(existing.id)
          continue
        }

        const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
          body: { email: invite.email, displayName: invite.name || undefined },
          headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
        })
        if (fnError) {
          setSaving(false)
          setProgress(null)
          setError(`Couldn't add ${invite.email}: ${fnError.message}`)
          return
        }
        if (data?.userId) newUserIds.push(data.userId)
      }
    }

    setProgress('Creating trip…')
    const stay: StayInput = {
      name: stayName.trim() || null,
      address: stayAddress.trim() || null,
      stayType,
      checkInAt: checkInAt ? new Date(checkInAt).toISOString() : null,
      checkOutAt: checkOutAt ? new Date(checkOutAt).toISOString() : null,
    }

    const { error: createError } = await createTrip({
      name: name.trim(),
      location: location.trim() || null,
      startDate,
      endDate,
      createdBy: profile.id,
      stay,
      inviteUserIds: [...selectedKnownIds, ...newUserIds],
    })

    setSaving(false)
    setProgress(null)
    if (createError) {
      setError(createError)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="flex max-h-[calc(100svh-2rem)] w-full max-w-md flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl bg-surface">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface p-4">
          <h2 className="text-xl font-semibold text-primary">Create a Trip</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none opacity-60">
            &times;
          </button>
        </div>

        <form id="create-trip-form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <input
            required
            placeholder="Trip name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            placeholder="Location (e.g. Asheville, NC)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-text-dim">
              Start date
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex-1 text-xs text-text-dim">
              End date
              <input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text"
              />
            </label>
          </div>

          <div className="rounded-lg bg-bg p-3">
            <p className="mb-2 text-sm font-medium">Where you're staying</p>
            <div className="flex flex-col gap-2">
              <input
                placeholder="Name (e.g. Grandma's cabin) — optional"
                value={stayName}
                onChange={(e) => setStayName(e.target.value)}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {STAY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setStayType(stayType === t.value ? null : t.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      stayType === t.value ? 'bg-primary text-white' : 'bg-surface text-text-dim'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                placeholder="Address — optional"
                value={stayAddress}
                onChange={(e) => setStayAddress(e.target.value)}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-text-dim">
                  Check-in
                  <input
                    type="datetime-local"
                    value={checkInAt}
                    onChange={(e) => setCheckInAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-text"
                  />
                </label>
                <label className="flex-1 text-xs text-text-dim">
                  Check-out
                  <input
                    type="datetime-local"
                    value={checkOutAt}
                    onChange={(e) => setCheckOutAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-text"
                  />
                </label>
              </div>
            </div>
          </div>

          {knownUsers.length > 0 && (
            <div className="rounded-lg bg-bg p-3">
              <p className="mb-2 text-sm font-medium">Invite people you already trip with</p>
              <div className="flex flex-col gap-1.5">
                {knownUsers.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedKnownIds.has(m.id)}
                      onChange={() => toggleKnown(m.id)}
                    />
                    {m.display_name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-bg p-3">
            <p className="mb-2 text-sm font-medium">Invite someone new by email</p>
            <p className="mb-2 text-xs text-text-dim">
              No email is actually sent — they'll get an account and set their own password the first time
              they sign in with that email.
            </p>
            {emailInvites.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {emailInvites.map((invite) => (
                  <li
                    key={invite.email}
                    className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs"
                  >
                    {invite.name ? `${invite.name} (${invite.email})` : invite.email}
                    <button
                      type="button"
                      onClick={() => removeEmailInvite(invite.email)}
                      className="text-text-dim"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              <input
                type="email"
                placeholder="Email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
              />
              <input
                placeholder="Name (optional)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={addEmailInvite}
                disabled={!inviteEmail.trim()}
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        <div className="sticky bottom-0 border-t border-line bg-surface p-4">
          <button
            type="submit"
            form="create-trip-form"
            disabled={saving}
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? progress ?? 'Creating…' : 'Create trip'}
          </button>
        </div>
      </div>
    </div>
  )
}
