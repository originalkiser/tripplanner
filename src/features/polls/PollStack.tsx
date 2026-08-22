import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { usePollsStore } from '../../stores/pollsStore'
import { PollSection } from './PollSection'

const EXIT_OFFSETS = [
  { x: -400, y: 40, rotate: -18 }, // left
  { x: 400, y: 40, rotate: 18 }, // right
  { x: 0, y: 500, rotate: 0 }, // down
]

export function PollStack() {
  const profile = useAuthStore((s) => s.profile)
  const { all, fetchAllForUser } = usePollsStore()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [exiting, setExiting] = useState<{ pollId: string; offset: (typeof EXIT_OFFSETS)[number] } | null>(
    null,
  )

  useEffect(() => {
    if (profile) void fetchAllForUser(profile.id)
  }, [profile, fetchAllForUser])

  const pending = useMemo(() => {
    if (!profile) return []
    return all
      .filter((p) => p.activity)
      .filter((p) => !p.votes.some((v) => v.user_id === profile.id))
      .filter((p) => !dismissed.has(p.id))
      .slice(0, 3)
  }, [all, profile, dismissed])

  if (pending.length === 0) return null

  function onVoted(pollId: string) {
    const offset = EXIT_OFFSETS[Math.floor(Math.random() * EXIT_OFFSETS.length)]
    setExiting({ pollId, offset })
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(pollId))
      setExiting(null)
    }, 320)
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
                <p className="text-xs font-medium text-text-dim">⏱ Vote on a time</p>
                <h3 className="mb-2 font-heading text-lg font-semibold">{poll.activity?.name}</h3>
                <PollSection poll={poll} compact onVoted={() => isTop && onVoted(poll.id)} />
              </div>
            )
          })
          .reverse()}
      </div>
    </div>
  )
}
