import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useWeatherStore } from '../../stores/weatherStore'
import { usePollsStore, pendingPolls } from '../../stores/pollsStore'
import { usePollSnoozeStore } from '../../stores/pollSnoozeStore'
import { usePendingPollCount } from '../polls/usePendingPollCount'
import { PollSection } from '../polls/PollSection'
import { TRIP_DAYS } from '../../lib/days'
import { weatherIcon, weatherLabel } from '../../lib/weather'

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

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Link
          to="/"
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
        <a
          href="#notifications"
          className="card-shadow relative flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center"
        >
          {pendingPollCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold text-white">
              {pendingPollCount}
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
          Notifications {pendingPollCount > 0 && `(${pendingPollCount})`}
        </h2>
        {myPendingPolls.length === 0 ? (
          <p className="card-shadow rounded-xl border border-dashed border-line bg-surface p-4 text-center text-sm text-text-dim">
            You're all caught up — no polls waiting on you.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
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
          {stay!.address && <p className="mt-1 text-sm text-text-dim">{stay!.address}</p>}
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
