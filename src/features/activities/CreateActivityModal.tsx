import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../../stores/authStore'
import { useActivitiesStore, type Activity, type ActivityFields } from '../../stores/activitiesStore'
import { categoryFromLatLng, searchLocations, type LocationResult } from '../../lib/geo'
import { MiniMap } from '../../components/MiniMap'
import { fetchLinkPreview } from '../../lib/linkPreview'
import { usePollsStore } from '../../stores/pollsStore'
import { supabase } from '../../lib/supabase'
import type { ActivityCategory, ActivityType, Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'activity', label: 'Activity' },
  { value: 'food_and_activity', label: 'Food & Activity' },
]

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hr' },
  { value: '90', label: '1.5 hr' },
  { value: '120', label: '2 hr' },
  { value: '150', label: '2.5 hr' },
  { value: '180', label: '3 hr' },
  { value: '240', label: '4 hr' },
  { value: '300', label: '5 hr' },
  { value: '360', label: '6 hr' },
  { value: '480', label: 'All day (8 hr)' },
]

const RATING_LABELS: Record<number, string> = {
  1: 'Would be nice',
  2: 'Interested',
  3: 'Pretty excited',
  4: 'Really want to',
  5: 'Have to do this',
}

const LOGGED_RATING_LABELS: Record<number, string> = {
  1: 'Meh',
  2: 'It was fine',
  3: 'Pretty good',
  4: 'Really good',
  5: 'Amazing',
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface PollOptionDraft {
  date: string
  time: string
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

export function CreateActivityModal({
  activity,
  logMode,
  onClose,
}: {
  activity?: Activity
  // "Log a visit" — a fast, minimal path for recording something already
  // done rather than planning something ahead: dated today by default, no
  // poll/unscheduled toggle, saved with source 'logged' instead of
  // 'user_added'. Only meaningful when creating (activity is unset).
  logMode?: boolean
  onClose: () => void
}) {
  const profile = useAuthStore((s) => s.profile)
  const createActivity = useActivitiesStore((s) => s.createActivity)
  const updateActivity = useActivitiesStore((s) => s.updateActivity)
  const inviteParticipants = useActivitiesStore((s) => s.inviteParticipants)
  const tagParticipants = useActivitiesStore((s) => s.tagParticipants)
  const isEdit = !!activity
  // Future plan vs. already happened/happening now — a toggle at the top of
  // the form rather than two separate modals, since the rest of the form is
  // otherwise identical. Fixed once an activity exists (editing never
  // reclassifies which one it was); for a new one it starts from whichever
  // entry point opened this modal (the "Log a Visit" shortcut vs. the
  // regular "+" button) but can be switched either way before saving.
  const [loggedMode, setLoggedMode] = useState(activity ? activity.source === 'logged' : !!logMode)
  // A logged visit already happened, so "invite" (a pending ask someone
  // still has to accept) doesn't fit — people picked here are tagged as
  // having been there, joined outright with no response needed.
  const isLogged = loggedMode

  const [members, setMembers] = useState<Member[]>([])
  const [inviteIds, setInviteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
      .then(({ data }) => setMembers(data ?? []))
  }, [])

  const alreadyParticipating = new Set(activity?.participants.map((p) => p.user_id) ?? [])
  const inviteCandidates = members.filter((m) => m.id !== profile?.id && !alreadyParticipating.has(m.id))

  function toggleInvite(userId: string) {
    setInviteIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const [type, setType] = useState<ActivityType>(activity?.type ?? 'activity')
  const [name, setName] = useState(activity?.name ?? '')
  const [date, setDate] = useState(activity?.proposed_date ?? (loggedMode ? todayIso() : ''))
  const [time, setTime] = useState(activity?.proposed_time?.slice(0, 5) ?? '')
  const [duration, setDuration] = useState(
    activity?.duration_minutes != null ? String(activity.duration_minutes) : '',
  )
  const [description, setDescription] = useState(activity?.description ?? '')
  const [rating, setRating] = useState<number | null>(null)
  const [linkUrl, setLinkUrl] = useState(activity?.link_url ?? '')
  const [fetchingLink, setFetchingLink] = useState(false)
  const [linkStatus, setLinkStatus] = useState<string | null>(null)

  const [locationQuery, setLocationQuery] = useState(activity?.location_name ?? '')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(
    activity?.location_lat && activity?.location_lng
      ? {
          displayName: activity.location_name ?? '',
          lat: activity.location_lat,
          lng: activity.location_lng,
          placeId: activity.location_place_id ?? '',
        }
      : null,
  )
  const [category, setCategory] = useState<ActivityCategory>(activity?.category ?? 'savannah')

  const [unscheduled, setUnscheduled] = useState(activity ? !activity.proposed_date : false)

  const [wantsPoll, setWantsPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState<PollOptionDraft[]>([{ date: '', time: '' }])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Switching to "Already happened" defaults the date to today (the common
  // case — logging something that just happened) without overwriting a date
  // someone already picked before flipping the toggle.
  useEffect(() => {
    if (loggedMode && !date) setDate(todayIso())
  }, [loggedMode, date])

  function onLocationInput(value: string) {
    setLocationQuery(value)
    setSelectedLocation(null)
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      const results = await searchLocations(value)
      setLocationResults(results)
    }, 400)
  }

  function pickLocation(loc: LocationResult) {
    setSelectedLocation(loc)
    setLocationQuery(loc.displayName)
    setLocationResults([])
    setCategory(categoryFromLatLng(loc.lat, loc.lng))
  }

  async function handleFetchLink() {
    if (!linkUrl.trim()) return
    setFetchingLink(true)
    setLinkStatus(null)
    const { preview, error } = await fetchLinkPreview(linkUrl.trim())
    setFetchingLink(false)

    if (error || !preview) {
      setLinkStatus(error ?? 'Could not fetch details from that link.')
      return
    }
    if (!description.trim() && preview.description) {
      setDescription(preview.description)
    }
    if (!name.trim() && preview.title) {
      setName(preview.title)
    }
    setLinkStatus('Filled in from the link.')
  }

  function updatePollOption(i: number, field: keyof PollOptionDraft, value: string) {
    setPollOptions((opts) => opts.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)

    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    setSaving(true)

    const fields: ActivityFields = {
      type,
      name: name.trim(),
      description: description.trim() || null,
      proposedDate: unscheduled ? null : date || null,
      proposedTime: unscheduled ? null : time || null,
      durationMinutes: unscheduled ? null : duration ? parseInt(duration, 10) : null,
      locationName: selectedLocation?.displayName ?? (locationQuery.trim() || null),
      locationLat: selectedLocation?.lat ?? null,
      locationLng: selectedLocation?.lng ?? null,
      locationPlaceId: selectedLocation?.placeId ?? null,
      linkUrl: linkUrl.trim() || null,
      category,
    }

    if (isEdit && activity) {
      const { error } = await updateActivity(activity.id, fields)
      if (error) {
        setSaving(false)
        setError(error)
        return
      }
      if (inviteIds.size > 0) {
        await (isLogged ? tagParticipants : inviteParticipants)(activity.id, [...inviteIds])
      }
      setSaving(false)
      onClose()
      return
    }

    const { error, activityId } = await createActivity({
      ...fields,
      source: loggedMode ? 'logged' : 'user_added',
      createdBy: profile.id,
      initialRating: rating,
    })

    if (error || !activityId) {
      setSaving(false)
      setError(error ?? 'Create failed')
      return
    }

    if (wantsPoll) {
      const validOptions = pollOptions.filter((o) => o.date && o.time)
      if (validOptions.length > 0) {
        const { data: poll } = await supabase
          .from('activity_polls')
          .insert({ activity_id: activityId, created_by: profile.id })
          .select('id')
          .single()
        if (poll) {
          await supabase.from('poll_options').insert(
            validOptions.map((o) => ({
              poll_id: poll.id,
              proposed_date: o.date,
              proposed_time: o.time,
              is_other: false,
              proposed_by: profile.id,
            })),
          )
          await usePollsStore.getState().fetchAllForUser(profile.id)
        }
      }
    }

    if (inviteIds.size > 0) {
      await (isLogged ? tagParticipants : inviteParticipants)(activityId, [...inviteIds])
    }

    setSaving(false)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
      {/* The card itself — not the form — is the scrolling region, with the
          header and save button sticky within it, so touch-scroll can
          always reach the bottom no matter how tall the content gets.
          Capped at 100svh (the smallest the viewport can ever be — same
          unit AppShell's own root uses) minus the overlay's own padding,
          rather than 100dvh/a percentage of the fixed overlay's own
          height: those track the *current* browser-chrome/keyboard state,
          which on some mobile browsers doesn't update fixed-position
          layout when that state changes mid-interaction — previously
          leaving the card taller than the actually-visible screen, clipped
          at both ends with no correct height to scroll within. svh never
          changes, so the cap is always honored. Portaled to document.body
          (see photo lightboxes for the same fix) since a plain z-50 here
          only wins within <main>'s own stacking context — it can't paint
          above the fixed hero scene or bottom nav sitting outside it as
          siblings, which otherwise clipped the top and bottom of the card. */}
      <div className="flex max-h-[calc(100svh-2rem)] w-full max-w-md flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl bg-surface">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface p-4">
          <h2 className="text-xl font-semibold text-primary">
            {isEdit ? 'Edit Activity' : loggedMode ? 'Log a Visit' : 'New Activity'}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none opacity-60">
            &times;
          </button>
        </div>

        <form id="activity-form" onSubmit={submit} className="flex flex-col gap-4 p-4">
          {!isEdit && (
            <div className="flex gap-2 rounded-full bg-bg p-1">
              <button
                type="button"
                onClick={() => setLoggedMode(false)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium ${
                  !loggedMode ? 'bg-primary text-white' : 'text-text-dim'
                }`}
              >
                Future plan
              </button>
              <button
                type="button"
                onClick={() => setLoggedMode(true)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium ${
                  loggedMode ? 'bg-primary text-white' : 'text-text-dim'
                }`}
              >
                Already happened
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${
                  type === opt.value ? 'bg-primary text-white' : 'bg-bg text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Link (optional)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2"
            />
            <button
              type="button"
              onClick={() => void handleFetchLink()}
              disabled={fetchingLink || !linkUrl.trim()}
              className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {fetchingLink ? 'Fetching…' : 'Fetch details'}
            </button>
          </div>
          {linkStatus && <p className="-mt-2 text-xs text-text-dim">{linkStatus}</p>}

          {!loggedMode && (
            <div className="flex items-center gap-2">
              <input
                id="unscheduled"
                type="checkbox"
                checked={unscheduled}
                onChange={(e) => setUnscheduled(e.target.checked)}
              />
              <label htmlFor="unscheduled" className="text-sm">
                Unscheduled (no specific day yet)
              </label>
            </div>
          )}

          {!unscheduled && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-bg px-3 py-2"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-bg px-3 py-2"
                />
              </div>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                aria-label="Duration"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label === 'Not set' ? 'Duration: not set' : `Duration: ${opt.label}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isEdit && !loggedMode && (
            <div className="rounded-lg bg-secondary/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  id="wantsPoll"
                  type="checkbox"
                  checked={wantsPoll}
                  onChange={(e) => setWantsPoll(e.target.checked)}
                />
                <label htmlFor="wantsPoll" className="text-sm font-medium">
                  Send poll for times
                </label>
              </div>
              {wantsPoll && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-text-dim">
                    Give people a few time options to vote on (everyone can also propose their
                    own "other" time).
                  </p>
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="date"
                        value={opt.date}
                        onChange={(e) => updatePollOption(i, 'date', e.target.value)}
                        className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
                      />
                      <input
                        type="time"
                        value={opt.time}
                        onChange={(e) => updatePollOption(i, 'time', e.target.value)}
                        className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
                      />
                      {pollOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions((o) => o.filter((_, idx) => idx !== i))}
                          className="px-2 text-text-dim"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPollOptions((o) => [...o, { date: '', time: '' }])}
                    className="self-start text-xs text-primary underline"
                  >
                    + Add another time option
                  </button>
                </div>
              )}
            </div>
          )}

          {inviteCandidates.length > 0 && (
            <div className="rounded-lg bg-secondary/10 p-3">
              <p className="text-sm font-medium">{isLogged ? 'Who else was there?' : 'Request others to join'}</p>
              <p className="mt-0.5 text-xs text-text-dim">
                {isLogged
                  ? "Tag anyone who visited with you — they'll show up as having joined, no response needed."
                  : "They'll show up as pending in their notifications until they accept or decline."}
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {inviteCandidates.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={inviteIds.has(m.id)}
                      onChange={() => toggleInvite(m.id)}
                    />
                    {m.display_name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <input
              placeholder="Search for a location"
              value={locationQuery}
              onChange={(e) => onLocationInput(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2"
            />
            {locationResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-line bg-surface shadow-lg">
                {locationResults.map((r) => (
                  <li key={r.placeId}>
                    <button
                      type="button"
                      onClick={() => pickLocation(r)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-bg"
                    >
                      {r.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedLocation && <MiniMap lat={selectedLocation.lat} lng={selectedLocation.lng} />}

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />

          {!isEdit && (
            <div>
              <p className="mb-1 text-sm font-medium">{loggedMode ? 'How was it?' : 'How excited are you?'}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    title={loggedMode ? LOGGED_RATING_LABELS[n] : RATING_LABELS[n]}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                      rating === n ? 'bg-accent text-white' : 'bg-bg text-text'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {rating && (
                <p className="mt-1 text-xs text-text-dim">
                  {loggedMode ? LOGGED_RATING_LABELS[rating] : RATING_LABELS[rating]}
                </p>
              )}
            </div>
          )}

        </form>

        {/* Outside the <form> (referenced via form="activity-form") but
            still inside the scrolling card, and sticky to its bottom —
            visible without scrolling when everything fits, and reachable by
            scrolling the card when it doesn't. */}
        <div className="sticky bottom-0 border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            form="activity-form"
            disabled={saving}
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : loggedMode ? 'Log Visit' : 'Add Activity'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
