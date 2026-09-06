import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePhotosStore, hasLiked, type Photo } from '../../stores/photosStore'
import { usePhotoSeenStore } from '../../stores/photoSeenStore'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tripPhotoUrl, isVideoPath } from '../../lib/storage'
import { searchLocations, reverseGeocode, type LocationResult } from '../../lib/geo'
import { downloadPhoto, downloadPhotosAsZip } from '../../lib/downloadPhotos'
import { HeartIcon } from './HeartIcon'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']
type SortMode = 'uploaded-asc' | 'uploaded-desc' | 'taken-asc' | 'taken-desc'

const SWIPE_THRESHOLD_PX = 50
const DOUBLE_TAP_MS = 300
const SINGLE_TAP_DELAY_MS = 250
const HEART_BURST_MS = 1400

function formatTaken(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function dayKeyOf(iso: string): string {
  return iso.slice(0, 10)
}

function formatDayLabel(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function TripAlbumPage() {
  const profile = useAuthStore((s) => s.profile)
  const { all, loading, fetchAll, upload, remove, linkToActivity, addTag, removeTag, toggleLike, setPhotoLocation } =
    usePhotosStore()
  const activities = useActivitiesStore((s) => s.activities)
  const fetchActivities = useActivitiesStore((s) => s.fetchActivities)
  const markPhotosSeen = usePhotoSeenStore((s) => s.markSeen)

  const [members, setMembers] = useState<Member[]>([])
  const [uploading, setUploading] = useState(false)
  const [taggingPhotoId, setTaggingPhotoId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number | null>(null)
  const isPinching = useRef(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null)
  const [burstId, setBurstId] = useState<string | null>(null)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTap = useRef<{ photoId: string; time: number } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('uploaded-asc')
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [savingLocation, setSavingLocation] = useState(false)
  const [locatingSelf, setLocatingSelf] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortField = sortMode.startsWith('taken') ? 'taken_at' : 'created_at'
  const sortDir = sortMode.endsWith('asc') ? 1 : -1
  const sorted = [...all].sort(
    (a, b) => (new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime()) * sortDir,
  )

  const lightbox = lightboxIndex != null ? sorted[lightboxIndex] : null

  useEffect(() => {
    void fetchAll()
    void fetchActivities()
    void supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
      .then(({ data }) => setMembers(data ?? []))
  }, [fetchAll, fetchActivities])

  // Opening the album is what "reading" a new-photos notification means —
  // clear it the moment someone lands here, not just when they act on it.
  useEffect(() => {
    markPhotosSeen()
  }, [markPhotosSeen])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !profile) return
    setUploading(true)
    for (const file of files) {
      await upload(file, profile.id, null)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo for everyone?')) return
    await remove(photo)
    setLightboxIndex(null)
  }

  function showPrev() {
    setLightboxIndex((i) => {
      if (i == null || i === 0) return i
      setSlideDir('left')
      return i - 1
    })
  }

  function showNext() {
    setLightboxIndex((i) => {
      if (i == null || i === sorted.length - 1) return i
      setSlideDir('right')
      return i + 1
    })
  }

  // A pinch-to-zoom gesture is two touch points — without this, its second
  // finger lifting off got read as a one-finger swipe (using whichever
  // finger happened to be in `changedTouches`), flipping to the next/prev
  // photo right as someone zoomed in on the current one.
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length > 1) {
      isPinching.current = true
      touchStartX.current = null
      return
    }
    isPinching.current = false
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length > 1) {
      isPinching.current = true
      touchStartX.current = null
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (isPinching.current) {
      isPinching.current = false
      return
    }
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX > SWIPE_THRESHOLD_PX) showPrev()
    else if (deltaX < -SWIPE_THRESHOLD_PX) showNext()
  }

  async function handleDownload(photo: Photo) {
    setDownloadingId(photo.id)
    try {
      await downloadPhoto(photo)
    } finally {
      setDownloadingId(null)
    }
  }

  function toggleSelected(photoId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === all.length ? new Set() : new Set(all.map((p) => p.id))))
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function openPhoto(i: number) {
    const photo = sorted[i]
    if (selectMode) {
      toggleSelected(photo.id)
      return
    }
    setSlideDir(null)
    setLightboxIndex(i)
  }

  function handleLikeToggle(photo: Photo) {
    if (!profile) return
    void toggleLike(photo, profile.id, hasLiked(photo, profile.id))
  }

  function startEditingLocation(photo: Photo) {
    setEditingLocationId(photo.id)
    setLocationQuery(photo.location_name ?? '')
    setLocationResults([])
    setLocationError(null)
  }

  function onLocationInput(value: string) {
    setLocationQuery(value)
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current)
    locationSearchTimer.current = setTimeout(async () => {
      setLocationResults(await searchLocations(value))
    }, 400)
  }

  // One entry per distinct name already used on some photo, newest first —
  // lets tagging a run of photos from the same spot skip typing/searching
  // after the first one.
  const recentLocations = (() => {
    const byName = new Map<string, { name: string; lat: number | null; lng: number | null; lastUsed: string }>()
    for (const p of all) {
      if (!p.location_name) continue
      const existing = byName.get(p.location_name)
      if (!existing || p.taken_at > existing.lastUsed) {
        byName.set(p.location_name, {
          name: p.location_name,
          lat: p.location_lat,
          lng: p.location_lng,
          lastUsed: p.taken_at,
        })
      }
    }
    return [...byName.values()].sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
  })()

  function matchingRecentLocations(query: string) {
    const q = query.trim().toLowerCase()
    const matches = q ? recentLocations.filter((r) => r.name.toLowerCase().includes(q)) : recentLocations
    return matches.slice(0, 5)
  }

  async function pickRecentLocation(
    photo: Photo,
    recent: { name: string; lat: number | null; lng: number | null },
  ) {
    setSavingLocation(true)
    await setPhotoLocation(photo, { name: recent.name, lat: recent.lat, lng: recent.lng })
    setSavingLocation(false)
    setEditingLocationId(null)
    setLocationResults([])
  }

  // Picking a suggestion sets real coordinates; just typing a name and
  // saving keeps whatever coordinates the photo already had (renaming, not
  // moving it) — or none, for a purely descriptive tag like "our Airbnb".
  async function saveLocation(photo: Photo, picked?: LocationResult) {
    setSavingLocation(true)
    const name = picked?.displayName ?? (locationQuery.trim() || null)
    const lat = picked?.lat ?? (name ? photo.location_lat : null)
    const lng = picked?.lng ?? (name ? photo.location_lng : null)
    await setPhotoLocation(photo, { name, lat, lng })
    setSavingLocation(false)
    setEditingLocationId(null)
    setLocationResults([])
  }

  function locateMyPosition(photo: Photo) {
    if (!navigator.geolocation) {
      setLocationError("This browser can't share your location.")
      return
    }
    setLocationError(null)
    setLocatingSelf(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const name = (await reverseGeocode(lat, lng)) ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        setLocatingSelf(false)
        await saveLocation(photo, { displayName: name, lat, lng, placeId: 'my-location' })
      },
      () => {
        setLocatingSelf(false)
        setLocationError("Couldn't get your location — check location permissions.")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Double-tap always likes (never unlikes) and always plays the heart
  // burst, even if already liked — matches the familiar Instagram gesture.
  function triggerLikeBurst(photo: Photo) {
    setBurstId(photo.id)
    setTimeout(() => setBurstId((id) => (id === photo.id ? null : id)), HEART_BURST_MS)
    if (profile && !hasLiked(photo, profile.id)) {
      void toggleLike(photo, profile.id, false)
    }
  }

  // A single tap opens the photo (or toggles selection); a second tap on
  // the same photo within DOUBLE_TAP_MS likes it instead. The single-tap
  // action is delayed just long enough to cancel it if a second tap lands.
  function handlePhotoTap(i: number) {
    const photo = sorted[i]
    const now = Date.now()
    const isDoubleTap = lastTap.current?.photoId === photo.id && now - lastTap.current.time < DOUBLE_TAP_MS
    lastTap.current = { photoId: photo.id, time: now }

    if (isDoubleTap) {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current)
        tapTimer.current = null
      }
      triggerLikeBurst(photo)
      return
    }

    tapTimer.current = setTimeout(() => {
      tapTimer.current = null
      openPhoto(i)
    }, SINGLE_TAP_DELAY_MS)
  }

  async function handleDownloadSelected() {
    const selected = all.filter((p) => selectedIds.has(p.id))
    if (selected.length === 0) return
    setZipping({ done: 0, total: selected.length })
    try {
      await downloadPhotosAsZip(selected, (done, total) => setZipping({ done, total }))
      exitSelectMode()
    } finally {
      setZipping(null)
    }
  }

  // Quick export filters: jump straight into select mode with the matching
  // photos already checked, rather than making people tap "Select" first
  // and then pick photos out one at a time.
  function selectFiltered(predicate: (photo: Photo) => boolean) {
    setSelectMode(true)
    setSelectedIds(new Set(all.filter(predicate).map((p) => p.id)))
  }

  function selectLiked() {
    if (!profile) return
    selectFiltered((p) => hasLiked(p, profile.id))
  }

  function selectTagged() {
    if (!profile) return
    selectFiltered((p) => p.tags.some((t) => t.user_id === profile.id))
  }

  function selectByActivity(activityId: string) {
    if (!activityId) return
    selectFiltered((p) => p.activity_id === activityId)
  }

  function selectByDay(dayKey: string) {
    if (!dayKey) return
    selectFiltered((p) => dayKeyOf(p.created_at) === dayKey)
  }

  const uniqueDays = Array.from(new Set(all.map((p) => dayKeyOf(p.created_at)))).sort()

  return (
    <div className="mx-auto max-w-md p-4 pb-32">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Trip Album</h1>
          <p className="mt-1 text-sm text-text-dim">Every photo and video from the trip, in time order.</p>
        </div>
        {all.length > 0 && (
          <button
            type="button"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      {all.length > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-text-dim">Sort:</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
          >
            <option value="uploaded-asc">Upload time (oldest first)</option>
            <option value="uploaded-desc">Upload time (newest first)</option>
            <option value="taken-asc">Photo time (oldest first)</option>
            <option value="taken-desc">Photo time (newest first)</option>
          </select>
        </div>
      )}

      {all.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-medium text-text-dim">Quick export:</span>
          <button
            type="button"
            onClick={selectLiked}
            className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
          >
            ❤ Liked
          </button>
          <button
            type="button"
            onClick={selectTagged}
            className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
          >
            🏷 Tagged
          </button>
          {activities.length > 0 && (
            <select
              value=""
              onChange={(e) => selectByActivity(e.target.value)}
              className="shrink-0 rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
            >
              <option value="" disabled>
                By event…
              </option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          {uniqueDays.length > 1 && (
            <select
              value=""
              onChange={(e) => selectByDay(e.target.value)}
              className="shrink-0 rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-medium text-text-dim"
            >
              <option value="" disabled>
                By day…
              </option>
              {uniqueDays.map((d) => (
                <option key={d} value={d}>
                  {formatDayLabel(d)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {all.length > 0 && (
        <div className="mt-2 -mx-4 flex gap-0 overflow-x-auto px-6 py-3">
          {sorted.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => openPhoto(i)}
              className="card-shadow relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-surface bg-surface"
              style={{ marginLeft: i === 0 ? 0 : -28, zIndex: i, transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 4}deg)` }}
            >
              {isVideoPath(photo.storage_path) ? (
                <video src={tripPhotoUrl(photo.storage_path)} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={tripPhotoUrl(photo.storage_path)} alt="" className="h-full w-full object-cover" />
              )}
              {isVideoPath(photo.storage_path) && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl text-white drop-shadow">
                  ▶
                </span>
              )}
              {selectMode && (
                <span
                  className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[11px] text-white ${
                    selectedIds.has(photo.id) ? 'bg-primary' : 'bg-black/30'
                  }`}
                >
                  {selectedIds.has(photo.id) ? '✓' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-4 text-sm text-text-dim">Loading…</p>}
      {!loading && all.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">No photos or videos yet — add the first one below.</p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {sorted.map((photo, i) => {
          const canManage = profile && (profile.id === photo.user_id || profile.is_admin)
          return (
            <div key={photo.id} className="card-shadow overflow-hidden rounded-xl border border-line bg-surface">
              <button
                type="button"
                onClick={() => (selectMode ? toggleSelected(photo.id) : handlePhotoTap(i))}
                className="relative block w-full touch-manipulation"
              >
                {isVideoPath(photo.storage_path) ? (
                  <video
                    src={tripPhotoUrl(photo.storage_path)}
                    muted
                    playsInline
                    className="max-h-96 w-full object-cover"
                  />
                ) : (
                  <img src={tripPhotoUrl(photo.storage_path)} alt="" className="max-h-96 w-full object-cover" />
                )}
                {isVideoPath(photo.storage_path) && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl text-white drop-shadow">
                    ▶
                  </span>
                )}
                {selectMode && (
                  <span
                    className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm text-white ${
                      selectedIds.has(photo.id) ? 'bg-primary' : 'bg-black/30'
                    }`}
                  >
                    {selectedIds.has(photo.id) ? '✓' : ''}
                  </span>
                )}
                {burstId === photo.id && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <HeartIcon filled className="heart-burst h-20 w-20 drop-shadow-lg" />
                  </span>
                )}
              </button>
              <div className="flex flex-col gap-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{photo.uploader?.display_name ?? 'Someone'}</span>
                  <span className="font-data text-xs text-text-dim">{formatTaken(photo.taken_at)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleLikeToggle(photo)}
                  className="flex items-center gap-1.5 self-start text-text-dim"
                >
                  <HeartIcon filled={!!profile && hasLiked(photo, profile.id)} className="h-5 w-5" />
                  {photo.likes.length > 0 && <span className="font-data text-xs">{photo.likes.length}</span>}
                </button>

                {editingLocationId === photo.id ? (
                  <div className="relative">
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={locationQuery}
                        onChange={(e) => onLocationInput(e.target.value)}
                        placeholder="Name this location"
                        className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={savingLocation}
                        onClick={() => void saveLocation(photo)}
                        className="shrink-0 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLocationId(null)}
                        className="shrink-0 rounded-lg bg-bg px-2 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={locatingSelf || savingLocation}
                      onClick={() => locateMyPosition(photo)}
                      className="mt-1 text-xs font-medium text-primary underline disabled:opacity-50"
                    >
                      {locatingSelf ? 'Finding you…' : '📍 Use my location'}
                    </button>
                    {locationError && <p className="mt-1 text-xs text-red-600">{locationError}</p>}
                    {(matchingRecentLocations(locationQuery).length > 0 || locationResults.length > 0) && (
                      <ul className="absolute z-10 mt-1 w-full rounded-lg border border-line bg-surface shadow-lg">
                        {matchingRecentLocations(locationQuery).map((r) => (
                          <li key={`recent-${r.name}`}>
                            <button
                              type="button"
                              onClick={() => void pickRecentLocation(photo, r)}
                              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-bg"
                            >
                              <span className="text-text-dim">↻</span> {r.name}
                            </button>
                          </li>
                        ))}
                        {locationResults.map((r) => (
                          <li key={r.placeId}>
                            <button
                              type="button"
                              onClick={() => void saveLocation(photo, r)}
                              className="block w-full px-2 py-1.5 text-left text-xs hover:bg-bg"
                            >
                              {r.displayName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditingLocation(photo)}
                    className="flex items-center gap-1 self-start rounded-full bg-bg px-2 py-1 text-xs text-text-dim"
                  >
                    📍 {photo.location_name ?? 'Add location'}
                  </button>
                )}

                <select
                  value={photo.activity_id ?? ''}
                  disabled={!canManage}
                  onChange={(e) => void linkToActivity(photo.id, e.target.value || null)}
                  className="rounded-lg border border-line bg-bg px-2 py-1 text-xs disabled:opacity-60"
                >
                  <option value="">No activity/location tagged</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-1">
                  {photo.tags.map((tag) => (
                    <span
                      key={tag.user_id}
                      className="flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] text-secondary"
                    >
                      {tag.profile?.display_name}
                      {(profile?.id === tag.user_id || profile?.id === photo.user_id || profile?.is_admin) && (
                        <button
                          type="button"
                          onClick={() => void removeTag(photo.id, tag.user_id)}
                          className="opacity-60"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTaggingPhotoId((v) => (v === photo.id ? null : photo.id))}
                    className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-text-dim"
                  >
                    {taggingPhotoId === photo.id ? 'Done tagging' : '+ Tag someone'}
                  </button>
                </div>

                {taggingPhotoId === photo.id && (
                  <div className="flex flex-wrap gap-1 rounded-lg bg-bg p-2">
                    {members
                      .filter((m) => !photo.tags.some((t) => t.user_id === m.id))
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => void addTag(photo.id, m.id, profile!.id)}
                          className="rounded-full bg-surface px-2 py-1 text-xs shadow-sm"
                        >
                          {m.display_name}
                        </button>
                      ))}
                  </div>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(photo)}
                    className="self-start text-xs text-text-dim underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md px-4">
        {selectMode ? (
          <div className="card-shadow flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="shrink-0 rounded-lg bg-bg px-3 py-2 text-xs font-medium text-text-dim"
            >
              {selectedIds.size === all.length ? 'Deselect all' : 'Select all'}
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0 || zipping != null}
              onClick={() => void handleDownloadSelected()}
              className="flex-1 rounded-lg bg-coral py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {zipping
                ? `Zipping ${zipping.done}/${zipping.total}…`
                : `Download${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
            </button>
          </div>
        ) : (
          <label className="card-shadow flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface py-3 text-sm font-medium text-primary">
            {uploading ? 'Uploading…' : '+ Add a photo or video'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => void handleUpload(e)}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {lightbox &&
        lightboxIndex != null &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2"
            onClick={() => setLightboxIndex(null)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white"
            >
              &times;
            </button>
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  showPrev()
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl text-white"
              >
                &#8249;
              </button>
            )}
            {lightboxIndex < sorted.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  showNext()
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl text-white"
              >
                &#8250;
              </button>
            )}
            {isVideoPath(lightbox.storage_path) ? (
              <video
                key={lightbox.id}
                src={tripPhotoUrl(lightbox.storage_path)}
                controls
                playsInline
                className={`max-h-[96dvh] max-w-full touch-manipulation object-contain ${
                  slideDir === 'right' ? 'photo-slide-in-right' : slideDir === 'left' ? 'photo-slide-in-left' : ''
                }`}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  triggerLikeBurst(lightbox)
                }}
              />
            ) : (
              <img
                key={lightbox.id}
                src={tripPhotoUrl(lightbox.storage_path)}
                alt=""
                className={`max-h-[96dvh] max-w-full touch-manipulation object-contain ${
                  slideDir === 'right' ? 'photo-slide-in-right' : slideDir === 'left' ? 'photo-slide-in-left' : ''
                }`}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  triggerLikeBurst(lightbox)
                }}
              />
            )}
            {burstId === lightbox.id && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <HeartIcon filled className="heart-burst h-28 w-28 drop-shadow-lg" />
              </span>
            )}
            <div
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-sm text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{lightbox.uploader?.display_name}</span>
              <button
                type="button"
                onClick={() => handleLikeToggle(lightbox)}
                className="flex items-center gap-1"
              >
                <HeartIcon filled={!!profile && hasLiked(lightbox, profile.id)} className="h-5 w-5" />
                {lightbox.likes.length > 0 && <span className="font-data text-xs">{lightbox.likes.length}</span>}
              </button>
              <button
                type="button"
                disabled={downloadingId === lightbox.id}
                onClick={() => void handleDownload(lightbox)}
                className="underline disabled:opacity-50"
              >
                {downloadingId === lightbox.id ? 'Downloading…' : 'Download'}
              </button>
              {profile && (profile.id === lightbox.user_id || profile.is_admin) && (
                <button type="button" onClick={() => void handleDelete(lightbox)} className="underline">
                  Delete
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
