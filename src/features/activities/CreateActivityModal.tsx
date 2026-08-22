import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useActivitiesStore, type Activity, type ActivityFields } from '../../stores/activitiesStore'
import { categoryFromLatLng, searchLocations, type LocationResult } from '../../lib/geo'
import { MiniMap } from '../../components/MiniMap'
import { fetchLinkPreview } from '../../lib/linkPreview'
import { usePollsStore } from '../../stores/pollsStore'
import { supabase } from '../../lib/supabase'
import type { ActivityCategory, ActivityType } from '../../types/database'

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'activity', label: 'Activity' },
  { value: 'food_and_activity', label: 'Food & Activity' },
]

const RATING_LABELS: Record<number, string> = {
  1: 'Would be nice',
  2: 'Interested',
  3: 'Pretty excited',
  4: 'Really want to',
  5: 'Have to do this',
}

interface PollOptionDraft {
  date: string
  time: string
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

export function CreateActivityModal({
  activity,
  onClose,
}: {
  activity?: Activity
  onClose: () => void
}) {
  const profile = useAuthStore((s) => s.profile)
  const createActivity = useActivitiesStore((s) => s.createActivity)
  const updateActivity = useActivitiesStore((s) => s.updateActivity)
  const isEdit = !!activity

  const [type, setType] = useState<ActivityType>(activity?.type ?? 'activity')
  const [name, setName] = useState(activity?.name ?? '')
  const [date, setDate] = useState(activity?.proposed_date ?? '')
  const [time, setTime] = useState(activity?.proposed_time?.slice(0, 5) ?? '')
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
      locationName: selectedLocation?.displayName ?? (locationQuery.trim() || null),
      locationLat: selectedLocation?.lat ?? null,
      locationLng: selectedLocation?.lng ?? null,
      locationPlaceId: selectedLocation?.placeId ?? null,
      linkUrl: linkUrl.trim() || null,
      category,
    }

    if (isEdit && activity) {
      const { error } = await updateActivity(activity.id, fields)
      setSaving(false)
      if (error) {
        setError(error)
        return
      }
      onClose()
      return
    }

    const { error, activityId } = await createActivity({
      ...fields,
      source: 'user_added',
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

    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-xl font-semibold text-primary">
            {isEdit ? 'Edit Activity' : 'New Activity'}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none opacity-60">
            &times;
          </button>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
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

          {!unscheduled && (
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
          )}

          {!isEdit && (
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
              <p className="mb-1 text-sm font-medium">How excited are you?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    title={RATING_LABELS[n]}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                      rating === n ? 'bg-accent text-white' : 'bg-bg text-text'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {rating && <p className="mt-1 text-xs text-text-dim">{RATING_LABELS[rating]}</p>}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add Activity'}
          </button>
        </form>
      </div>
    </div>
  )
}
