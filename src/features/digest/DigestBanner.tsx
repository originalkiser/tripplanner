import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useDigestStore } from '../../stores/digestStore'
import { CHANGE_GROUP_LABEL } from './changeLabels'
import type { ChangeType } from '../../types/database'

export function DigestBanner() {
  const previousLastSeenAt = useAuthStore((s) => s.previousLastSeenAt)
  const { sinceLastVisit, fetchSinceLastVisit } = useDigestStore()
  const [dismissed, setDismissed] = useState(false)

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
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <span aria-hidden>👋</span> While you were away
        </p>
        <button type="button" onClick={() => setDismissed(true)} className="text-xs opacity-80">
          Dismiss
        </button>
      </div>
      <ul className="mt-1 flex flex-col gap-0.5 text-sm opacity-95">
        {(Object.entries(counts) as [ChangeType, number][]).map(([type, count]) => (
          <li key={type}>
            {count} {CHANGE_GROUP_LABEL[type].toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  )
}
