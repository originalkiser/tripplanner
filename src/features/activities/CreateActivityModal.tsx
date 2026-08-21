import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { categoryFromLatLng, searchLocations, type LocationResult } from '../../lib/geo'
import { MiniMap } from '../../components/MiniMap'
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

let searchTimer: ReturnType<typeof setTimeout> | undefined

export function CreateActivityModal({ onClose }: { onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const createActivity = useActivitiesStore((s) => s.createActivity)

  const [type, setType] = useState<ActivityType>('activity')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [rating, setRating] = useState<number | null>(null)

  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null)
  const [category, setCategory] = useState<ActivityCategory>('savannah')
  const [categoryTouched, setCategoryTouched] = useState(false)

  const [unscheduled, setUnscheduled] = useState(false)
  const [importedNote, setImportedNote] = useState(false)

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
    if (!categoryTouched) {
      setCategory(categoryFromLatLng(loc.lat, loc.lng))
    }
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
    const { error } = await createActivity({
      type,
      name: name.trim(),
      description: description.trim() || null,
      proposedDate: unscheduled ? null : date || null,
      proposedTime: unscheduled ? null : time || null,
      locationName: selectedLocation?.displayName ?? (locationQuery.trim() || null),
      locationLat: selectedLocation?.lat ?? null,
      locationLng: selectedLocation?.lng ?? null,
      locationPlaceId: selectedLocation?.placeId ?? null,
      category,
      source: importedNote && profile.is_admin ? 'imported_note' : 'user_added',
      createdBy: profile.id,
      initialRating: rating,
    })
    setSaving(false)

    if (error) {
      setError(error)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-4 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">New Activity</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none opacity-60">
            &times;
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
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
            className="rounded-lg border border-secondary/30 bg-bg px-3 py-2"
          />

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

          {profile?.is_admin && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2">
              <input
                id="importedNote"
                type="checkbox"
                checked={importedNote}
                onChange={(e) => {
                  setImportedNote(e.target.checked)
                  if (e.target.checked) setUnscheduled(true)
                }}
              />
              <label htmlFor="importedNote" className="text-sm">
                Add without a day (imported from shared note)
              </label>
            </div>
          )}

          {!unscheduled && (
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-lg border border-secondary/30 bg-bg px-3 py-2"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 rounded-lg border border-secondary/30 bg-bg px-3 py-2"
              />
            </div>
          )}

          <div className="relative">
            <input
              placeholder="Search for a location"
              value={locationQuery}
              onChange={(e) => onLocationInput(e.target.value)}
              className="w-full rounded-lg border border-secondary/30 bg-bg px-3 py-2"
            />
            {locationResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-secondary/30 bg-surface shadow-lg">
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

          {selectedLocation && (
            <MiniMap lat={selectedLocation.lat} lng={selectedLocation.lng} />
          )}

          <div className="flex gap-2">
            {(['savannah', 'tybee'] as ActivityCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c)
                  setCategoryTouched(true)
                }}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium capitalize ${
                  category === c ? 'bg-secondary text-white' : 'bg-bg text-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-secondary/30 bg-bg px-3 py-2"
          />

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
            {rating && <p className="mt-1 text-xs opacity-60">{RATING_LABELS[rating]}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add Activity'}
          </button>
        </form>
      </div>
    </div>
  )
}
