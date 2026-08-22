import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { usePollsStore, pendingPolls } from '../../stores/pollsStore'
import { usePollSnoozeStore } from '../../stores/pollSnoozeStore'
import { PollSection } from './PollSection'

const EXIT_OFFSETS = [
  { x: -400, y: 40, rotate: -18 }, // left
  { x: 400, y: 40, rotate: 18 }, // right
  { x: 0, y: 500, rotate: 0 }, // down
]

export function PollStack() {
  const profile = useAuthStore((s) => s.profile)
  const { all, fetchAllForUser } = usePollsStore()
  const { isSnoozed, snooze } = usePollSnoozeStore()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [exiting, setExiting] = useState<{ pollId: string; offset: (typeof EXIT_OFFSETS)[number] } | null>(
    null,
  )

  useEffect(() => {
    if (profile) void fetchAllForUser(profile.id)
  }, [profile, fetchAllForUser])

  const pending = useMemo(() => {
    if (!profile) return []
    return pendingPolls(all, profile.id)
      .filter((p) => !dismissed.has(p.id))
      .filter((p) => !isSnoozed(p.id))
      .slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, profile, dismissed])

  if (pending.length === 0) return null

  function dismissCard(pollId: string) {
    const offset = EXIT_OFFSETS[Math.floor(Math.random() * EXIT_OFFSETS.length)]
    setExiting({ pollId, offset })
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(pollId))
      setExiting(null)
    }, 320)
  }

  function handleRemindLater(pollId: string) {
    snooze(pollId)
    dismissCard(pollId)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--scene-h)+12px)] z-30 flex justify-center px-4">
      <div className="relative h-auto w-full max-w-sm">
        {pending
          .map((poll, i) => {
            const isTop = i === 0
            const isExiting = exiting?.pollId === poll.id
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
            return (
              <div
                key={poll.id}
                className={`card-shadow absolute inset-x-0 rounded-2xl border border-line bg-surface p-4 ${
                  isTop ? 'pointer-events-auto' : ''
                }`}
                style={style}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-text-dim">⏱ Vote on a time</p>
                    <h3 className="font-heading text-lg font-semibold">{poll.activity?.name}</h3>
                  </div>
                  {isTop && (
                    <button
                      type="button"
                      onClick={() => handleRemindLater(poll.id)}
                      className="shrink-0 whitespace-nowrap rounded-full bg-bg px-2 py-1 text-[11px] font-medium text-text-dim"
                    >
                      Remind me later
                    </button>
                  )}
                </div>
                <PollSection poll={poll} compact onVoted={() => isTop && dismissCard(poll.id)} />
              </div>
            )
          })
          .reverse()}
      </div>
    </div>
  )
}
