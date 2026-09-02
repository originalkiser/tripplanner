import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../stores/activitiesStore'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { useAuthStore } from '../../stores/authStore'
import { usePhotosStore } from '../../stores/photosStore'
import { usePollsStore } from '../../stores/pollsStore'
import { useDigestStore } from '../../stores/digestStore'
import { supabase } from '../../lib/supabase'
import { googleMapsUrl, appleMapsUrl, isIOS } from '../../lib/geo'
import { resolveAssetUrl } from '../../lib/assetUrl'
import { PhotoGallery } from '../photos/PhotoGallery'
import { PollSection } from '../polls/PollSection'
import { ActivityHistory } from './ActivityHistory'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

const CreateActivityModal = lazy(() =>
  import('./CreateActivityModal').then((m) => ({ default: m.CreateActivityModal })),
)

const TYPE_LABEL: Record<string, string> = {
  food: 'Food',
  activity: 'Activity',
  food_and_activity: 'Food & Activity',
}

const TYPE_PILL_STYLE: Record<string, string> = {
  food: 'bg-coral/15 text-coral',
  activity: 'bg-primary/15 text-primary',
  food_and_activity: 'bg-secondary/15 text-secondary',
}

const FALLBACK_AVATAR = resolveAssetUrl('/avatars/starfish.svg')!

// Stable reference so the Zustand selector below doesn't return a fresh
// array on every call (that trips useSyncExternalStore into an infinite
// re-render loop, since it looks like the snapshot changed every time).
const EMPTY_PHOTOS: never[] = []
const EMPTY_HISTORY: never[] = []

function avgRating(activity: Activity): number | null {
  const rated = activity.participants.filter((p) => p.rating != null)
  if (!rated.length) return null
  return rated.reduce((sum, p) => sum + (p.rating ?? 0), 0) / rated.length
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${m} ${ampm}`
}

function formatProposedDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function ActivityCard({
  activity,
  haloColor,
  highlightId,
  scheduleCallout,
}: {
  activity: Activity
  haloColor?: string | null
  highlightId?: string | null
  // Shown on the Planned page's "Needs Scheduling" section — these cards
  // are still technically unplanned, so call out what's missing (or, if
  // someone's already proposed a time, that the shown time is tentative).
  scheduleCallout?: boolean
}) {
  const profile = useAuthStore((s) => s.profile)
  const { joinActivity, proposeAltTime, rateActivity, leaveActivity, adoptProposedTime, inviteParticipants } =
    useActivitiesStore()

  const [expanded, setExpanded] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [proposeDate, setProposeDate] = useState('')
  const [proposeTime, setProposeTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [inviteIds, setInviteIds] = useState<Set<string>>(new Set())
  const [confirmProposal, setConfirmProposal] = useState<{ date: string; time: string; name: string } | null>(
    null,
  )
  const cardRef = useRef<HTMLDivElement>(null)

  const photos = usePhotosStore((s) => s.byActivity[activity.id] ?? EMPTY_PHOTOS)
  const fetchPhotosForActivity = usePhotosStore((s) => s.fetchForActivity)
  const poll = usePollsStore((s) => s.byActivity[activity.id])
  const fetchPollForActivity = usePollsStore((s) => s.fetchForActivity)
  const history = useDigestStore((s) => s.byActivity[activity.id] ?? EMPTY_HISTORY)
  const fetchHistoryForActivity = useDigestStore((s) => s.fetchForActivity)

  useEffect(() => {
    if (expanded) {
      void fetchPhotosForActivity(activity.id)
      void fetchPollForActivity(activity.id)
      void fetchHistoryForActivity(activity.id)
    }
  }, [expanded, activity.id, fetchPhotosForActivity, fetchPollForActivity, fetchHistoryForActivity])

  useEffect(() => {
    if (showInvite && members.length === 0) {
      void supabase
        .from('user_profiles')
        .select('*')
        .order('display_name')
        .then(({ data }) => setMembers(data ?? []))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInvite])

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
  // Based on having a proposed date/time at all, not on status === 'proposed_alt_time'
  // — someone who was already joined and then proposed a different time keeps
  // their 'joined' status (see proposeAltTime), so status alone would miss them.
  const proposedAlts = activity.participants.filter((p) => p.proposed_date && p.proposed_time)
  const earliestProposal = [...proposedAlts]
    .filter((p) => p.proposed_date && p.proposed_time)
    .sort(
      (a, b) =>
        `${a.proposed_date}T${a.proposed_time}`.localeCompare(`${b.proposed_date}T${b.proposed_time}`),
    )[0]
  // Once a proposal has actually been applied to the activity, showing it
  // again as a "proposed" badge on the collapsed card is just noise — it's
  // not a suggestion anymore, it's what's happening. The expanded view
  // still credits whose proposal it was (see the callout below).
  const isApplied = (p: (typeof proposedAlts)[number]) =>
    p.proposed_date === activity.proposed_date && p.proposed_time === activity.proposed_time
  const unmatchedProposals = proposedAlts.filter((p) => !isApplied(p))
  const usedProposal = activity.proposed_date ? proposedAlts.find(isApplied) : undefined
  const canEdit = !!profile

  const alreadyParticipating = new Set(activity.participants.map((p) => p.user_id))
  const inviteCandidates = members.filter((m) => m.id !== profile?.id && !alreadyParticipating.has(m.id))

  function toggleInvite(userId: string) {
    setInviteIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function sendInvites() {
    if (inviteIds.size === 0) return
    setBusy(true)
    await inviteParticipants(activity.id, [...inviteIds])
    setBusy(false)
    setInviteIds(new Set())
    setShowInvite(false)
  }

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

  function openProposeForm() {
    setExpanded(true)
    setProposing(true)
  }

  async function handleAdoptProposedTime(date: string, time: string) {
    setBusy(true)
    await adoptProposedTime(activity.id, date, time)
    setBusy(false)
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
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="w-full cursor-pointer text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_PILL_STYLE[activity.type]}`}
              >
                {TYPE_LABEL[activity.type]}
              </span>
            </div>
            <h3 className="mt-1 font-heading text-lg font-semibold">{activity.name}</h3>
            <p className="font-data text-xs text-text-dim">
              {activity.proposed_time ? formatTime(activity.proposed_time) : 'No time set'}
              {activity.proposed_time && activity.duration_minutes != null && ` · ${formatDuration(activity.duration_minutes)}`}
              {rating != null && ` · ${rating.toFixed(1)}★`}
            </p>
          </div>
          {activity.creator && activity.source !== 'imported_note' && (
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

        {scheduleCallout && !activity.proposed_date && !earliestProposal && (
          <div className="mt-2 inline-block rounded-lg bg-coral/15 px-2 py-1 text-xs font-medium text-coral">
            Day/time needed
          </div>
        )}

        {unmatchedProposals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {unmatchedProposals.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (p.proposed_date && p.proposed_time) {
                    setConfirmProposal({
                      date: p.proposed_date,
                      time: p.proposed_time,
                      name: p.profile?.display_name ?? 'Someone',
                    })
                  }
                }}
                disabled={busy || !p.proposed_date || !p.proposed_time}
                title="Update to this proposed time"
                className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] text-secondary underline decoration-dotted disabled:no-underline"
              >
                {p.profile?.display_name} proposed{' '}
                {p.proposed_date ? formatProposedDate(p.proposed_date) : ''} {formatTime(p.proposed_time)}
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-text-dim">{joined.length} attending</p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex -space-x-2">
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
        <button
          type="button"
          onClick={() => {
            setExpanded(true)
            setShowInvite(true)
          }}
          className="shrink-0 rounded-full bg-bg px-3 py-1 text-xs font-medium text-primary"
        >
          + Invite more
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {activity.location_lat != null && activity.location_lng != null && (
          <Link
            to={`/map?activity=${activity.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1 text-xs font-medium text-primary"
          >
            <PinIcon /> View on map
          </Link>
        )}
        {activity.location_lat != null && activity.location_lng != null && (
          <a
            href={
              isIOS()
                ? appleMapsUrl(activity.location_lat, activity.location_lng)
                : googleMapsUrl(activity.location_lat, activity.location_lng)
            }
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-bg px-3 py-1 text-xs font-medium text-primary"
          >
            Open in Maps
          </a>
        )}
        {activity.link_url && (
          <a
            href={activity.link_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-bg px-3 py-1 text-xs font-medium text-primary"
          >
            View link
          </a>
        )}
        {!mine && (
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={busy}
            className="ml-auto shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Join
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          {showInvite ? (
            <div className="rounded-lg bg-secondary/10 p-3">
              <p className="mb-2 text-sm font-medium">Invite others</p>
              {inviteCandidates.length === 0 ? (
                <p className="text-xs text-text-dim">Everyone's already in or invited.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {inviteCandidates.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={inviteIds.has(m.id)} onChange={() => toggleInvite(m.id)} />
                      {m.display_name}
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {inviteCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void sendInvites()}
                    disabled={busy || inviteIds.size === 0}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Send invites
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-lg bg-bg px-3 py-1.5 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="self-start rounded-lg bg-bg px-3 py-1.5 text-sm font-medium"
            >
              Invite others
            </button>
          )}

          {usedProposal && (
            <div className="inline-block self-start rounded-lg bg-accent/15 px-2 py-1 text-xs font-medium text-accent">
              Using {usedProposal.profile?.display_name ?? 'someone'}&rsquo;s proposed time
            </div>
          )}

          {activity.description && <p className="text-sm">{activity.description}</p>}

          {activity.location_name && <p className="text-sm text-text-dim">{activity.location_name}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={openProposeForm}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                scheduleCallout && !activity.proposed_date && !earliestProposal
                  ? 'bg-coral text-white'
                  : 'bg-bg'
              }`}
            >
              {activity.proposed_date ? 'Propose new time' : 'Propose time'}
            </button>
            {mine && (
              <button
                type="button"
                onClick={() => void handleLeave()}
                disabled={busy}
                className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50"
              >
                Leave
              </button>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="self-start rounded-full bg-bg px-3 py-1.5 text-sm font-medium text-primary"
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

          <div className="border-t border-line pt-3">
            <p className="mb-1 text-xs font-medium text-text-dim">History</p>
            <ActivityHistory entries={history} />
          </div>
        </div>
      )}

      {showEdit && (
        <Suspense fallback={null}>
          <CreateActivityModal activity={activity} onClose={() => setShowEdit(false)} />
        </Suspense>
      )}

      {confirmProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmProposal(null)}
        >
          <div
            className="card-shadow w-full max-w-xs rounded-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold">Use Proposed Date and Time?</h3>
              <button
                type="button"
                onClick={() => setConfirmProposal(null)}
                className="text-xl leading-none opacity-60"
              >
                &times;
              </button>
            </div>
            <p className="mb-4 text-sm text-text-dim">
              {confirmProposal.name}&rsquo;s proposal: {formatProposedDate(confirmProposal.date)} ·{' '}
              {formatTime(confirmProposal.time)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await handleAdoptProposedTime(confirmProposal.date, confirmProposal.time)
                  setConfirmProposal(null)
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Yes, use this time
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmProposal(null)
                  openProposeForm()
                }}
                className="rounded-lg bg-bg px-4 py-2 text-sm font-medium"
              >
                Choose different time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}
