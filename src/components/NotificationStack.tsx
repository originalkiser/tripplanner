import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePollsStore, pendingPolls, type Poll } from '../stores/pollsStore'
import { usePollSnoozeStore } from '../stores/pollSnoozeStore'
import { useActivitiesStore, pendingInvites, type Activity } from '../stores/activitiesStore'
import { useInviteSnoozeStore } from '../stores/inviteSnoozeStore'
import { PollSection } from '../features/polls/PollSection'

const EXIT_OFFSETS = [
  { x: -400, y: 40, rotate: -18 }, // left
  { x: 400, y: 40, rotate: 18 }, // right
  { x: 0, y: 500, rotate: 0 }, // down
]

type Card = { id: string } & ({ kind: 'poll'; poll: Poll } | { kind: 'invite'; activity: Activity })

// Both pending time-polls and pending activity join-requests need to
// "prompt the person next time they open the app" — sharing one card
// stack (rather than two independent floating stacks) avoids them
// visually colliding when both happen to be pending at once.
export function NotificationStack() {
  const profile = useAuthStore((s) => s.profile)
  const { all: allPolls, fetchAllForUser } = usePollsStore()
  const { isSnoozed: isPollSnoozed, snooze: snoozePoll } = usePollSnoozeStore()
  const activities = useActivitiesStore((s) => s.activities)
  const respondToInvite = useActivitiesStore((s) => s.respondToInvite)
  const { isSnoozed: isInviteSnoozed, snooze: snoozeInvite } = useInviteSnoozeStore()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [exiting, setExiting] = useState<{ id: string; offset: (typeof EXIT_OFFSETS)[number] } | null>(null)

  useEffect(() => {
    if (profile) void fetchAllForUser(profile.id)
  }, [profile, fetchAllForUser])

  const cards = useMemo<Card[]>(() => {
    if (!profile) return []
    const inviteCards: Card[] = pendingInvites(activities, profile.id)
      .filter(({ activity }) => !isInviteSnoozed(activity.id, profile.id))
      .map(({ activity }) => ({ kind: 'invite', id: `invite:${activity.id}`, activity }))
    const pollCards: Card[] = pendingPolls(allPolls, profile.id)
      .filter((p) => !isPollSnoozed(p.id))
      .map((p) => ({ kind: 'poll', id: `poll:${p.id}`, poll: p }))
    return [...inviteCards, ...pollCards].filter((c) => !dismissed.has(c.id)).slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPolls, activities, profile, dismissed])

  if (cards.length === 0) return null

  function dismissCard(id: string) {
    const offset = EXIT_OFFSETS[Math.floor(Math.random() * EXIT_OFFSETS.length)]
    setExiting({ id, offset })
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(id))
      setExiting(null)
    }, 320)
  }

  async function respondInvite(activityId: string, accept: boolean) {
    if (!profile) return
    setBusyId(`invite:${activityId}`)
    await respondToInvite(activityId, profile.id, accept)
    setBusyId(null)
    dismissCard(`invite:${activityId}`)
  }

  function decideLater(activityId: string) {
    if (!profile) return
    snoozeInvite(activityId, profile.id)
    dismissCard(`invite:${activityId}`)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--scene-h)+12px)] z-30 flex justify-center px-4">
      <div className="relative h-auto w-full max-w-sm">
        {cards
          .map((card, i) => {
            const isTop = i === 0
            const isExiting = exiting?.id === card.id
            const style: React.CSSProperties = isExiting
              ? {
                  transform: `translate(${exiting.offset.x}px, ${exiting.offset.y}px) rotate(${exiting.offset.rotate}deg)`,
                  opacity: 0,
                  transition: 'transform 300ms ease-in, opacity 300ms ease-in',
                }
              : {
                  transform: `translateY(${i * 8}px) scale(${1 - i * 0.04}) rotate(${i === 0 ? 0 : i % 2 === 0 ? -2 : 2}deg)`,
                  zIndex: 10 - i,
                }

            if (card.kind === 'poll') {
              return (
                <div
                  key={card.id}
                  className={`card-shadow absolute inset-x-0 rounded-2xl border border-line bg-surface p-4 ${
                    isTop ? 'pointer-events-auto' : ''
                  }`}
                  style={style}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-text-dim">⏱ Vote on a time</p>
                      <h3 className="font-heading text-lg font-semibold">{card.poll.activity?.name}</h3>
                    </div>
                    {isTop && (
                      <button
                        type="button"
                        onClick={() => {
                          snoozePoll(card.poll.id)
                          dismissCard(card.id)
                        }}
                        className="shrink-0 whitespace-nowrap rounded-full bg-bg px-2 py-1 text-[11px] font-medium text-text-dim"
                      >
                        Remind me later
                      </button>
                    )}
                  </div>
                  <PollSection poll={card.poll} compact onVoted={() => isTop && dismissCard(card.id)} />
                </div>
              )
            }

            const busy = busyId === card.id
            return (
              <div
                key={card.id}
                className={`card-shadow absolute inset-x-0 rounded-2xl border border-line bg-surface p-4 ${
                  isTop ? 'pointer-events-auto' : ''
                }`}
                style={style}
              >
                <p className="text-xs font-medium text-text-dim">🙋 Join request</p>
                <h3 className="mb-2 font-heading text-lg font-semibold">{card.activity.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void respondInvite(card.activity.id, true)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void respondInvite(card.activity.id, false)}
                    className="rounded-lg bg-bg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decideLater(card.activity.id)}
                    className="rounded-lg bg-bg px-3 py-1.5 text-sm font-medium text-text-dim disabled:opacity-50"
                  >
                    Decide later
                  </button>
                </div>
              </div>
            )
          })
          .reverse()}
      </div>
    </div>
  )
}
