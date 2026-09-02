import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useWeatherStore } from '../../stores/weatherStore'
import { usePollsStore, pendingPolls } from '../../stores/pollsStore'
import { usePollSnoozeStore } from '../../stores/pollSnoozeStore'
import { usePendingPollCount } from '../polls/usePendingPollCount'
import { PollSection } from '../polls/PollSection'
import { useActivitiesStore, pendingInvites } from '../../stores/activitiesStore'
import { usePendingInviteCount } from '../activities/usePendingInviteCount'
import { usePackingStore, type PackingItem } from '../../stores/packingStore'
import { resolveAssetUrl } from '../../lib/assetUrl'
import { TRIP_DAYS } from '../../lib/days'
import { weatherIcon, weatherLabel } from '../../lib/weather'
import { googleMapsAddressUrl, appleMapsAddressUrl, isIOS } from '../../lib/geo'

// An item still "needs" someone: uncapped and nobody's bringing it yet, or
// capped and still short of the quantity needed.
function stillNeeded(item: PackingItem): boolean {
  const covered = item.bringers.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + b.quantity, 0)
  return item.quantity_needed == null ? covered === 0 : covered < item.quantity_needed
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${m} ${ampm}`
}

interface Stay {
  trip_id: string
  name: string | null
  address: string | null
  notes: string | null
  link_url: string | null
  updated_by: string | null
  updated_at: string
}

export function HomePage() {
  const profile = useAuthStore((s) => s.profile)
  const weatherDaily = useWeatherStore((s) => s.daily)
  const fetchWeather = useWeatherStore((s) => s.fetch)
  const allPolls = usePollsStore((s) => s.all)
  const { snooze } = usePollSnoozeStore()
  const pendingPollCount = usePendingPollCount()
  const myPendingPolls = profile ? pendingPolls(allPolls, profile.id) : []
  const activities = useActivitiesStore((s) => s.activities)
  const fetchActivities = useActivitiesStore((s) => s.fetchActivities)
  const respondToInvite = useActivitiesStore((s) => s.respondToInvite)
  const pendingInviteCount = usePendingInviteCount()
  const myPendingInvites = profile ? pendingInvites(activities, profile.id) : []
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const notificationCount = pendingPollCount + pendingInviteCount

  const { lists: packingLists, items: packingItems, fetchLists: fetchPackingLists, fetchItems: fetchPackingItems } =
    usePackingStore()
  const tripPackingList = packingLists.find((l) => l.kind === 'trip')
  const myPrivateLists = packingLists.filter((l) => l.kind === 'private')
  const privateListIdsKey = myPrivateLists.map((l) => l.id).join(',')

  useEffect(() => {
    void fetchPackingLists()
  }, [fetchPackingLists])

  useEffect(() => {
    if (tripPackingList) void fetchPackingItems(tripPackingList.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripPackingList?.id, fetchPackingItems])

  useEffect(() => {
    myPrivateLists.forEach((l) => void fetchPackingItems(l.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateListIdsKey, fetchPackingItems])

  const groupRemaining = tripPackingList
    ? (packingItems[tripPackingList.id] ?? []).filter((i) => !i.deleted_at && stillNeeded(i)).length
    : 0
  const personalRemaining = myPrivateLists.reduce(
    (sum, l) => sum + (packingItems[l.id] ?? []).filter((i) => !i.deleted_at && stillNeeded(i)).length,
    0,
  )
  const [stay, setStay] = useState<Stay | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showWeather, setShowWeather] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    void fetchWeather()
  }, [fetchWeather])

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  async function respond(activityId: string, accept: boolean) {
    if (!profile) return
    setRespondingId(activityId)
    await respondToInvite(activityId, profile.id, accept)
    setRespondingId(null)
  }

  async function load() {
    setLoading(true)
    const { data: trip } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
    if (!trip) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('stays').select('*').eq('trip_id', trip.id).maybeSingle()
    if (data) {
      setStay(data)
      setName(data.name ?? '')
      setAddress(data.address ?? '')
      setNotes(data.notes ?? '')
      setLinkUrl(data.link_url ?? '')
    }
    setLoading(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)

    const { data: trip } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
    if (!trip) {
      setSaving(false)
      setError('No active trip found.')
      return
    }

    const { error } = await supabase.from('stays').upsert({
      trip_id: trip.id,
      name: name.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      link_url: linkUrl.trim() || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(false)
    await load()
  }

  if (loading) {
    return <div className="p-4 text-sm text-text-dim">Loading…</div>
  }

  const hasDetails = stay && (stay.name || stay.address || stay.notes || stay.link_url)

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Home</h1>
      <p className="mt-1 text-sm text-text-dim">Where the group is staying — anyone can edit this.</p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Link
          to="/planned"
          className="card-shadow flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          <TodayIcon />
          <span className="text-xs font-medium">Today's Plans</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowWeather((v) => !v)}
          className="card-shadow flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          <span className="text-xl leading-none">
            {weatherDaily[TRIP_DAYS[0].date] ? weatherIcon(weatherDaily[TRIP_DAYS[0].date].code) : '🌤️'}
          </span>
          <span className="text-xs font-medium">Weather</span>
        </button>
        <Link
          to="/map"
          className="card-shadow flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          <MapQuickIcon />
          <span className="text-xs font-medium">Map</span>
        </Link>
        <Link
          to="/album"
          className="card-shadow flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          <AlbumQuickIcon />
          <span className="text-xs font-medium">Album</span>
        </Link>
        <Link
          to="/packing"
          className="card-shadow flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          <PackingQuickIcon />
          <span className="text-xs font-medium">Packing List</span>
          <span className="text-[10px] text-text-dim">
            {groupRemaining} left{myPrivateLists.length > 0 ? ` · ${personalRemaining} yours` : ''}
          </span>
        </Link>
        <a
          href="#notifications"
          className="card-shadow relative flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold text-white">
              {notificationCount}
            </span>
          )}
          <NotificationsIcon />
          <span className="text-xs font-medium">Notifications</span>
        </a>
      </div>

      {showWeather && (
        <div className="card-shadow mt-2 rounded-xl border border-line bg-surface p-3">
          {TRIP_DAYS.every((d) => !weatherDaily[d.date]) ? (
            <p className="text-sm text-text-dim">Forecast isn't available yet — it opens up about two weeks out.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {TRIP_DAYS.map((d) => {
                const w = weatherDaily[d.date]?.code != null ? weatherDaily[d.date] : undefined
                return (
                  <li key={d.date} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: d.color }} />
                      {d.shortLabel}
                    </span>
                    {w ? (
                      <span className="font-data flex items-center gap-1.5 text-text-dim">
                        {weatherIcon(w.code)} {weatherLabel(w.code)} · {w.tempMaxF}&deg;/{w.tempMinF}&deg;
                      </span>
                    ) : (
                      <span className="text-xs text-text-dim">Not available yet</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div id="notifications" className="mt-4 scroll-mt-4">
        <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim">
          Notifications {notificationCount > 0 && `(${notificationCount})`}
        </h2>
        {myPendingPolls.length === 0 && myPendingInvites.length === 0 ? (
          <p className="card-shadow rounded-xl border border-dashed border-line bg-surface p-4 text-center text-sm text-text-dim">
            You're all caught up
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {myPendingInvites.map(({ activity }) => (
              <div key={activity.id} className="card-shadow rounded-xl border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {activity.creator?.avatar_url ? (
                      <img
                        src={resolveAssetUrl(activity.creator.avatar_url) ?? undefined}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-secondary/20" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-text-dim">
                        {activity.creator?.display_name ?? 'Someone'} requested you join
                      </p>
                      <h3 className="font-heading text-base font-semibold">{activity.name}</h3>
                      {activity.proposed_date && (
                        <p className="font-data text-xs text-text-dim">
                          {activity.proposed_date}
                          {activity.proposed_time && ` · ${formatTime(activity.proposed_time)}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={respondingId === activity.id}
                    onClick={() => void respond(activity.id, true)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === activity.id}
                    onClick={() => void respond(activity.id, false)}
                    className="rounded-lg bg-bg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {myPendingPolls.map((poll) => (
              <div key={poll.id} className="card-shadow rounded-xl border border-line bg-surface p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-text-dim">⏱ Vote on a time</p>
                    <h3 className="font-heading text-base font-semibold">{poll.activity?.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => snooze(poll.id)}
                    className="shrink-0 whitespace-nowrap rounded-full bg-bg px-2 py-1 text-[11px] font-medium text-text-dim"
                  >
                    Remind me later
                  </button>
                </div>
                <PollSection poll={poll} compact />
              </div>
            ))}
          </div>
        )}
      </div>

      {!editing && hasDetails && (
        <div className="card-shadow mt-4 rounded-xl border border-line bg-surface p-4">
          {stay!.name && <h2 className="font-heading text-lg font-semibold">{stay!.name}</h2>}
          {stay!.address && (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-text-dim">{stay!.address}</p>
              <a
                href={
                  isIOS() ? appleMapsAddressUrl(stay!.address) : googleMapsAddressUrl(stay!.address)
                }
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-bg px-3 py-1 text-xs font-medium text-primary"
              >
                Open in Maps
              </a>
            </div>
          )}
          {stay!.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{stay!.notes}</p>}
          {stay!.link_url && (
            <a href={stay!.link_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-primary underline">
              View link
            </a>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            Edit
          </button>
        </div>
      )}

      {!editing && !hasDetails && (
        <div className="card-shadow mt-4 rounded-xl border border-dashed border-line bg-surface p-4 text-center">
          <p className="text-sm text-text-dim">Nobody's added where we're staying yet.</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            Add stay details
          </button>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="card-shadow mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            placeholder="Name (e.g. The Marshall House)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <textarea
            placeholder="Notes (check-in time, door code, parking, whatever's useful)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            type="url"
            placeholder="Link (booking confirmation, listing, etc.)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-coral px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl bg-bg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function TodayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
  )
}

function NotificationsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

function MapQuickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

function AlbumQuickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-4-4 3-3-2-6 5" />
    </svg>
  )
}

function PackingQuickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4.5A2.5 2.5 0 0 1 9.5 2h5A2.5 2.5 0 0 1 17 4.5V5H7z" />
      <rect x="4" y="4" width="16" height="18" rx="3" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M12 12h5" />
      <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" />
      <path d="M12 17h5" />
    </svg>
  )
}
