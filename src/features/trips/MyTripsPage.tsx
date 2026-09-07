import { useEffect, useState } from 'react'
import { useTripsStore, type MyTripDetails } from '../../stores/tripsStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getStoredCurrentTripId, setCurrentTripId, pickCurrentTrip, pickUpcomingTrip, pickDefaultTrip } from '../../lib/currentTrip'
import { resolveAssetUrl } from '../../lib/assetUrl'
import { CreateTripModal } from './CreateTripModal'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

const FALLBACK_AVATAR = resolveAssetUrl('/avatars/starfish.svg')!

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function MyTripsPage() {
  const profile = useAuthStore((s) => s.profile)
  const { myTrips, members, fetchMyTrips, fetchMembers, setMemberRole, updateMyDetails, addMembers } = useTripsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [knownUsers, setKnownUsers] = useState<Member[]>([])
  const [viewingTripId] = useState(() => getStoredCurrentTripId())

  const currentTrip = pickCurrentTrip(myTrips)
  const upcomingTrip = pickUpcomingTrip(myTrips)
  // What "viewing" resolves to right now: the explicit per-device choice if
  // one's been made, otherwise whatever lib/currentTrip.ts would fall back
  // to (same logic, run here just to render the right "Viewing" badge).
  const resolvedViewingId = viewingTripId ?? pickDefaultTrip(myTrips)?.id ?? null

  useEffect(() => {
    if (profile) void fetchMyTrips(profile.id)
  }, [profile, fetchMyTrips])

  useEffect(() => {
    void supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
      .then(({ data }) => setKnownUsers(data ?? []))
  }, [])

  function toggleExpanded(tripId: string) {
    if (expandedId === tripId) {
      setExpandedId(null)
      return
    }
    setExpandedId(tripId)
    void fetchMembers(tripId)
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-8">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex items-center justify-between gap-2 bg-bg px-4 pb-3 pt-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">My Trips</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
        >
          + Create trip
        </button>
      </div>

      {myTrips.length === 0 && (
        <p className="mt-4 text-center text-sm text-text-dim">
          You're not on any trips yet — create one to get started.
        </p>
      )}

      {(currentTrip || upcomingTrip) && (
        <div className="mt-4 flex gap-2">
          {currentTrip && (
            <button
              type="button"
              onClick={() => setCurrentTripId(currentTrip.id)}
              disabled={resolvedViewingId === currentTrip.id}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              View current trip
            </button>
          )}
          {upcomingTrip && (
            <button
              type="button"
              onClick={() => setCurrentTripId(upcomingTrip.id)}
              disabled={resolvedViewingId === upcomingTrip.id}
              className="flex-1 rounded-lg border border-primary px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
            >
              View upcoming trip
            </button>
          )}
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {myTrips.map((trip) => {
          const isViewing = trip.id === resolvedViewingId
          return (
            <li key={trip.id} className="card-shadow overflow-hidden rounded-xl border border-line bg-surface">
              <button
                type="button"
                onClick={() => toggleExpanded(trip.id)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold">{trip.name}</p>
                    {currentTrip?.id === trip.id && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Happening now
                      </span>
                    )}
                    {isViewing && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Viewing
                      </span>
                    )}
                    {trip.myRole === 'admin' && (
                      <span className="rounded-full bg-bg px-2 py-0.5 text-[10px] font-medium text-text-dim">
                        admin
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-dim">
                    {trip.location && `${trip.location} · `}
                    {formatDateRange(trip.start_date, trip.end_date)}
                  </p>
                </div>
                <span className="shrink-0 text-text-dim">{expandedId === trip.id ? '−' : '+'}</span>
              </button>

              {expandedId === trip.id && profile && (
                <TripManagePanel
                  tripId={trip.id}
                  isViewing={isViewing}
                  isAdmin={trip.myRole === 'admin'}
                  members={members[trip.id] ?? []}
                  knownUsers={knownUsers}
                  myUserId={profile.id}
                  onSetRole={setMemberRole}
                  onUpdateMyDetails={updateMyDetails}
                  onAddMembers={addMembers}
                  onView={() => setCurrentTripId(trip.id)}
                />
              )}
            </li>
          )
        })}
      </ul>

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            if (profile) void fetchMyTrips(profile.id)
          }}
        />
      )}
    </div>
  )
}

function TripManagePanel({
  tripId,
  isViewing,
  isAdmin,
  members,
  knownUsers,
  myUserId,
  onSetRole,
  onUpdateMyDetails,
  onAddMembers,
  onView,
}: {
  tripId: string
  isViewing: boolean
  isAdmin: boolean
  members: ReturnType<typeof useTripsStore.getState>['members'][string]
  knownUsers: Member[]
  myUserId: string
  onSetRole: (tripId: string, userId: string, role: 'admin' | 'member') => Promise<{ error: string | null }>
  onUpdateMyDetails: (tripId: string, userId: string, fields: MyTripDetails) => Promise<{ error: string | null }>
  onAddMembers: (tripId: string, userIds: string[]) => Promise<{ error: string | null }>
  onView: () => void
}) {
  const mine = members.find((m) => m.user_id === myUserId)
  const [arrivalDate, setArrivalDate] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [adultsCount, setAdultsCount] = useState(1)
  const [childrenCount, setChildrenCount] = useState(0)
  const [allergies, setAllergies] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [addUserIds, setAddUserIds] = useState<Set<string>>(new Set())
  const [addingMembers, setAddingMembers] = useState(false)

  useEffect(() => {
    if (mine) {
      setArrivalDate(mine.arrival_date ?? '')
      setDepartureDate(mine.departure_date ?? '')
      setAdultsCount(mine.adults_count)
      setChildrenCount(mine.children_count)
      setAllergies(mine.allergies ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.user_id, mine?.arrival_date, mine?.departure_date, mine?.adults_count, mine?.children_count, mine?.allergies])

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault()
    setSavingDetails(true)
    await onUpdateMyDetails(tripId, myUserId, {
      arrivalDate: arrivalDate || null,
      departureDate: departureDate || null,
      adultsCount,
      childrenCount,
      allergies: allergies.trim() || null,
    })
    setSavingDetails(false)
  }

  async function handleToggleRole(userId: string, currentRole: 'admin' | 'member') {
    setBusyUserId(userId)
    await onSetRole(tripId, userId, currentRole === 'admin' ? 'member' : 'admin')
    setBusyUserId(null)
  }

  const addCandidates = knownUsers.filter((u) => !members.some((m) => m.user_id === u.id))

  async function handleAddMembers() {
    setAddingMembers(true)
    await onAddMembers(tripId, [...addUserIds])
    setAddingMembers(false)
    setAddUserIds(new Set())
    setShowInvite(false)
  }

  return (
    <div className="border-t border-line p-3">
      {isViewing ? (
        <p className="mb-3 text-center text-xs text-text-dim">You're viewing this trip right now.</p>
      ) : (
        <button
          type="button"
          onClick={onView}
          className="mb-3 w-full rounded-lg border border-primary px-3 py-2 text-xs font-medium text-primary"
        >
          View this trip
        </button>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">Roster</p>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-2 text-sm">
            <img
              src={resolveAssetUrl(m.profile?.avatar_url) ?? FALLBACK_AVATAR}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="flex-1">{m.profile?.display_name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                m.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-bg text-text-dim'
              }`}
            >
              {m.role}
            </span>
            {isAdmin && (
              <button
                type="button"
                disabled={busyUserId === m.user_id}
                onClick={() => void handleToggleRole(m.user_id, m.role)}
                className="rounded-full bg-bg px-2 py-1 text-[10px] font-medium text-text-dim disabled:opacity-50"
              >
                {m.role === 'admin' ? 'Remove admin' : 'Make admin'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <div className="mt-3">
          {!showInvite ? (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
            >
              + Invite more people
            </button>
          ) : (
            <div className="rounded-lg bg-bg p-2">
              {addCandidates.length === 0 ? (
                <p className="text-xs text-text-dim">Everyone with an account is already on this trip.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {addCandidates.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={addUserIds.has(u.id)}
                        onChange={() =>
                          setAddUserIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(u.id)) next.delete(u.id)
                            else next.add(u.id)
                            return next
                          })
                        }
                      />
                      {u.display_name}
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {addCandidates.length > 0 && (
                  <button
                    type="button"
                    disabled={addUserIds.size === 0 || addingMembers}
                    onClick={() => void handleAddMembers()}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Add
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-full bg-surface px-3 py-1 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mine && (
        <form onSubmit={(e) => void handleSaveDetails(e)} className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Your plans for this trip</p>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-text-dim">
              Arriving
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-text"
              />
            </label>
            <label className="flex-1 text-xs text-text-dim">
              Leaving
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-text"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-text-dim">
              Adults
              <input
                type="number"
                min={0}
                value={adultsCount}
                onChange={(e) => setAdultsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-text"
              />
            </label>
            <label className="flex-1 text-xs text-text-dim">
              Children
              <input
                type="number"
                min={0}
                value={childrenCount}
                onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-text"
              />
            </label>
          </div>
          <label className="text-xs text-text-dim">
            Allergies & food preferences
            <textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              rows={2}
              placeholder="e.g. peanut allergy, vegetarian"
              className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-text"
            />
          </label>
          <button
            type="submit"
            disabled={savingDetails}
            className="self-start rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {savingDetails ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}
