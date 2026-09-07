import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useDigestStore } from '../../stores/digestStore'
import { useDigestTripFilterStore } from '../../stores/digestTripFilterStore'
import { useTripsStore } from '../../stores/tripsStore'
import { setCurrentTripId } from '../../lib/currentTrip'
import { supabase } from '../../lib/supabase'
import { ActivityQuickView } from '../activities/ActivityQuickView'
import { PageHeader } from '../../components/layout/PageHeader'
import { CHANGE_VERB } from './changeLabels'
import { groupChangeEntries, groupSummary, groupTargetLabel } from './groupChanges'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDay(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

interface RecentInvite {
  tripId: string
  tripName: string
  joinedAt: string
}

const RECENT_INVITE_WINDOW_DAYS = 7

export function DigestPage() {
  const profile = useAuthStore((s) => s.profile)
  const [date, setDate] = useState(todayIso())
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const [recentInvites, setRecentInvites] = useState<RecentInvite[]>([])
  const { dayEntries, loadingDay, fetchDay } = useDigestStore()
  const { myTrips, fetchMyTrips } = useTripsStore()
  const { selectedTripId, hydrated, hydrate, setSelectedTripId } = useDigestTripFilterStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (profile) void fetchMyTrips(profile.id)
  }, [profile, fetchMyTrips])

  useEffect(() => {
    if (!hydrated) return
    void fetchDay(date, selectedTripId)
  }, [date, selectedTripId, hydrated, fetchDay])

  // Trips this person was added to (not their own) recently — surfaced so
  // an invite doesn't just silently sit in "My Trips" unnoticed.
  useEffect(() => {
    if (!profile) return
    void (async () => {
      const since = new Date(Date.now() - RECENT_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('trip_members')
        .select('joined_at, trip:trips!inner(id, name, created_by)')
        .eq('user_id', profile.id)
        .gte('joined_at', since)
      const invites = ((data ?? []) as unknown as { joined_at: string; trip: { id: string; name: string; created_by: string | null } }[])
        .filter((row) => row.trip.created_by !== profile.id)
        .map((row) => ({ tripId: row.trip.id, tripName: row.trip.name, joinedAt: row.joined_at }))
      setRecentInvites(invites)
    })()
  }, [profile])

  // Your own actions aren't news to you — this is meant to show what
  // everyone *else* on the trip has been up to.
  const others = dayEntries.filter((e) => e.user_id !== profile?.id)
  const showTripBadge = selectedTripId === null

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <PageHeader title="Daily Digest" />

      {recentInvites.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {recentInvites.map((invite) => (
            <button
              key={invite.tripId}
              type="button"
              onClick={() => setCurrentTripId(invite.tripId)}
              className="card-shadow flex items-center justify-between gap-2 rounded-xl bg-accent px-4 py-3 text-left text-sm text-white"
            >
              <span>
                You were added to <span className="font-semibold">{invite.tripName}</span>
              </span>
              <span className="shrink-0 text-xs underline">View trip &rarr;</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <select
          value={selectedTripId ?? ''}
          onChange={(e) => setSelectedTripId(e.target.value || null)}
          className="card-shadow w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">All trips</option>
          {myTrips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDate((d) => shiftDay(d, -1))}
          className="card-shadow rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          &larr; Prev
        </button>
        <span className="font-heading text-sm font-medium">{formatDay(date)}</span>
        <button
          type="button"
          onClick={() => setDate((d) => shiftDay(d, 1))}
          className="card-shadow rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          Next &rarr;
        </button>
      </div>

      {loadingDay && <p className="mt-4 text-sm text-text-dim">Loading…</p>}

      {!loadingDay && others.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">Nothing happened this day.</p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {groupChangeEntries(others).map((g) => {
          const { verb, detail } = groupSummary(g)
          const target = groupTargetLabel(g)
          return (
            <li key={g.key} className="card-shadow rounded-xl border border-line bg-surface p-3 text-sm">
              {showTripBadge && g.entries[0].trip && (
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-dim">
                  {g.entries[0].trip.name}
                </p>
              )}
              <span className="font-medium">{g.user?.display_name ?? 'Someone'}</span>{' '}
              {verb || CHANGE_VERB[g.changeType]}{' '}
              {target &&
                (g.activity ? (
                  <button
                    type="button"
                    onClick={() => setQuickViewId(g.activity!.id)}
                    className="font-medium text-primary underline"
                  >
                    {target}
                  </button>
                ) : (
                  <span className="font-medium">{target}</span>
                ))}
              {detail && <p className="mt-1 text-xs text-text-dim">{detail}</p>}
              <p className="font-data mt-1 text-[11px] text-text-dim">
                {new Date(g.createdAt).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </li>
          )
        })}
      </ul>

      {quickViewId && <ActivityQuickView activityId={quickViewId} onClose={() => setQuickViewId(null)} />}
    </div>
  )
}
