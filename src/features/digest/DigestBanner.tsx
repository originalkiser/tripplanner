import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useDigestStore } from '../../stores/digestStore'
import { CHANGE_GROUP_LABEL, CHANGE_VERB } from './changeLabels'
import type { ChangeType } from '../../types/database'

export function DigestBanner({ onSelectActivity }: { onSelectActivity: (id: string) => void }) {
  const previousLastSeenAt = useAuthStore((s) => s.previousLastSeenAt)
  const { sinceLastVisit, fetchSinceLastVisit } = useDigestStore()
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (previousLastSeenAt) void fetchSinceLastVisit(previousLastSeenAt)
  }, [previousLastSeenAt, fetchSinceLastVisit])

  if (!previousLastSeenAt || sinceLastVisit.length === 0 || dismissed) return null

  const counts = sinceLastVisit.reduce(
    (acc, e) => {
      acc[e.change_type] = (acc[e.change_type] ?? 0) + 1
      return acc
    },
    {} as Record<ChangeType, number>,
  )

  return (
    <div
      className="card-shadow mb-4 rounded-xl p-3 text-white"
      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <span aria-hidden>👋</span> While you were away
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="text-xs opacity-80">
          Dismiss
        </button>
      </div>

      {!showDetails ? (
        <button type="button" onClick={() => setShowDetails(true)} className="mt-1 block text-left">
          <ul className="flex flex-col gap-0.5 text-sm opacity-95">
            {(Object.entries(counts) as [ChangeType, number][]).map(([type, count]) => (
              <li key={type}>
                {count} {CHANGE_GROUP_LABEL[type].toLowerCase()}
              </li>
            ))}
          </ul>
        </button>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5 border-t border-white/20 pt-2 text-sm">
          {sinceLastVisit.map((e) => {
            const content = (
              <>
                <span className="font-medium">{e.user?.display_name ?? 'Someone'}</span>{' '}
                {CHANGE_VERB[e.change_type]}{' '}
                <span className="font-medium">{e.activity?.name ?? 'an activity'}</span>
              </>
            )
            return (
              <li key={e.id}>
                {e.activity ? (
                  <button
                    type="button"
                    onClick={() => onSelectActivity(e.activity!.id)}
                    className="text-left underline underline-offset-2"
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
