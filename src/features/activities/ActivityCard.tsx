import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Activity } from '../../stores/activitiesStore'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { useAuthStore } from '../../stores/authStore'
import { usePhotosStore } from '../../stores/photosStore'
import { usePollsStore } from '../../stores/pollsStore'
import { googleMapsUrl, appleMapsUrl, isIOS } from '../../lib/geo'
import { resolveAssetUrl } from '../../lib/assetUrl'
import { PhotoGallery } from '../photos/PhotoGallery'
import { PollSection } from '../polls/PollSection'

const CreateActivityModal = lazy(() =>
  import('./CreateActivityModal').then((m) => ({ default: m.CreateActivityModal })),
)

const TYPE_LABEL: Record<string, string> = {
  food: 'Food',
  activity: 'Activity',
  food_and_activity: 'Food & Activity',
}

const FALLBACK_AVATAR = resolveAssetUrl('/avatars/starfish.svg')!

// Stable reference so the Zustand selector below doesn't return a fresh
// array on every call (that trips useSyncExternalStore into an infinite
// re-render loop, since it looks like the snapshot changed every time).
const EMPTY_PHOTOS: never[] = []

function avgRating(activity: Activity): number | null {
  const rated = activity.participants.filter((p) => p.rating != null)
  if (!rated.length) return null
  return rated.reduce((sum, p) => sum + (p.rating ?? 0), 0) / rated.length
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${m} ${ampm}`
}

export function ActivityCard({
  activity,
  haloColor,
  highlightId,
}: {
  activity: Activity
  haloColor?: string | null
  highlightId?: string | null
}) {
  const profile = useAuthStore((s) => s.profile)
  const { joinActivity, proposeAltTime, rateActivity, leaveActivity } = useActivitiesStore()

  const [expanded, setExpanded] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [proposeDate, setProposeDate] = useState('')
  const [proposeTime, setProposeTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const photos = usePhotosStore((s) => s.byActivity[activity.id] ?? EMPTY_PHOTOS)
  const fetchPhotosForActivity = usePhotosStore((s) => s.fetchForActivity)
  const poll = usePollsStore((s) => s.byActivity[activity.id])
  const fetchPollForActivity = usePollsStore((s) => s.fetchForActivity)

  useEffect(() => {
    if (expanded) {
      void fetchPhotosForActivity(activity.id)
      void fetchPollForActivity(activity.id)
    }
  }, [expanded, activity.id, fetchPhotosForActivity, fetchPollForActivity])

  useEffect(() => {
    if (highlightId && highlightId === activity.id) {
      setExpanded(true)
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId])

  const rating = avgRating(activity)
  const mine = profile ? activity.participants.find((p) => p.user_id === profile.id) : undefined
  const joined = activity.participants.filter((p) => p.status === 'joined')
  const proposedAlts = activity.participants.filter((p) => p.status === 'proposed_alt_time')
  const canEdit = profile && (profile.id === activity.created_by || profile.is_admin)

  async function handleJoin() {
    if (!profile) return
    setBusy(true)
    await joinActivity(activity.id, profile.id)
    setBusy(false)
  }

  async function handleLeave() {
    if (!profile) return
    setBusy(true)
    await leaveActivity(activity.id, profile.id)
    setBusy(false)
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !proposeDate || !proposeTime) return
    setBusy(true)
    await proposeAltTime(activity.id, profile.id, proposeDate, proposeTime)
    setBusy(false)
    setProposing(false)
  }

  async function handleRate(n: number) {
    if (!profile) return
    setBusy(true)
    await rateActivity(activity.id, profile.id, n)
    setBusy(false)
  }

  return (
    <div
      ref={cardRef}
      className="card-shadow rounded-xl border bg-surface p-3"
      style={{
        borderColor: haloColor ?? 'var(--color-line)',
        boxShadow: haloColor ? `0 0 0 1px ${haloColor}22, var(--shadow-card)` : undefined,
      }}
    >
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {TYPE_LABEL[activity.type]}
              </span>
              {activity.source === 'imported_note' && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  Imported from shared note
                </span>
              )}
            </div>
            <h3 className="mt-1 font-heading text-lg font-semibold">{activity.name}</h3>
            <p className="font-data text-xs text-text-dim">
              {activity.proposed_time ? formatTime(activity.proposed_time) : 'No time set'}
              {rating != null && ` · ${rating.toFixed(1)}★`}
            </p>
          </div>
          {activity.creator && (
            <div className="flex flex-col items-center gap-1 text-center">
              {activity.creator.avatar_url ? (
                <img
                  src={resolveAssetUrl(activity.creator.avatar_url) ?? undefined}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-secondary/20" />
              )}
              <span className="text-[10px] text-text-dim">{activity.creator.display_name}</span>
            </div>
          )}
        </div>

        {joined.length > 0 && (
          <div className="mt-2 flex -space-x-2">
            {joined.map((p) => (
              <img
                key={p.user_id}
                src={resolveAssetUrl(p.profile?.avatar_url) ?? FALLBACK_AVATAR}
                alt={p.profile?.display_name ?? ''}
                title={p.profile?.display_name ?? ''}
                className="h-6 w-6 rounded-full border-2 border-surface object-cover"
              />
            ))}
          </div>
        )}

        {proposedAlts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {proposedAlts.map((p) => (
              <span
                key={p.user_id}
                className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] text-secondary"
              >
                {p.profile?.display_name} proposed {p.proposed_date} {formatTime(p.proposed_time)}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          {activity.description && <p className="text-sm">{activity.description}</p>}

          {(activity.location_name || activity.link_url) && (
            <div className="text-sm">
              {activity.location_name && <p className="text-text-dim">{activity.location_name}</p>}
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                {activity.location_lat && activity.location_lng && (
                  <a
                    href={
                      isIOS()
                        ? appleMapsUrl(activity.location_lat, activity.location_lng)
                        : googleMapsUrl(activity.location_lat, activity.location_lng)
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Open in Maps
                  </a>
                )}
                {activity.link_url && (
                  <a href={activity.link_url} target="_blank" rel="noreferrer" className="text-primary underline">
                    View link
                  </a>
                )}
              </div>
            </div>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="self-start text-xs text-primary underline"
            >
              Edit
            </button>
          )}

          {poll && <PollSection poll={poll} />}

          <div>
            <p className="mb-1 text-xs font-medium text-text-dim">Who's in</p>
            {joined.length === 0 && <p className="text-xs opacity-50">Nobody yet</p>}
            <ul className="flex flex-col gap-1">
              {joined.map((p) => (
                <li key={p.user_id} className="flex items-center gap-2 text-sm">
                  <img
                    src={resolveAssetUrl(p.profile?.avatar_url) ?? FALLBACK_AVATAR}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  {p.profile?.display_name}
                  {p.rating != null && <span className="opacity-50">· {p.rating}★</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {!mine && (
              <button
                type="button"
                onClick={() => void handleJoin()}
                disabled={busy}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Join
              </button>
            )}
            {mine && (
              <button
                type="button"
                onClick={() => void handleLeave()}
                disabled={busy}
                className="rounded-lg bg-secondary/20 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Leave
              </button>
            )}
            <button
              type="button"
              onClick={() => setProposing((v) => !v)}
              className="rounded-lg bg-bg px-3 py-1.5 text-sm font-medium"
            >
              Propose different time
            </button>
          </div>

          {proposing && (
            <form onSubmit={handlePropose} className="flex gap-2">
              <input
                type="date"
                required
                value={proposeDate}
                onChange={(e) => setProposeDate(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
              />
              <input
                type="time"
                required
                value={proposeTime}
                onChange={(e) => setProposeTime(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
            </form>
          )}

          {mine && (
            <div>
              <p className="mb-1 text-xs font-medium text-text-dim">Your rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => void handleRate(n)}
                    className={`h-7 w-7 rounded text-xs font-medium ${
                      mine.rating === n ? 'bg-accent text-white' : 'bg-bg'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-text-dim">Photos</p>
            <PhotoGallery activityId={activity.id} photos={photos} />
          </div>
        </div>
      )}

      {showEdit && (
        <Suspense fallback={null}>
          <CreateActivityModal activity={activity} onClose={() => setShowEdit(false)} />
        </Suspense>
      )}
    </div>
  )
}
