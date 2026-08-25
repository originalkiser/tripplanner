import { useEffect, useMemo, useState } from 'react'
import { useActivitiesStore } from '../stores/activitiesStore'
import { findHappeningNow } from '../lib/happeningNow'
import { ActivityQuickView } from '../features/activities/ActivityQuickView'

export function HappeningNowBanner() {
  const activities = useActivitiesStore((s) => s.activities)
  const [now, setNow] = useState(() => new Date())
  const [quickViewId, setQuickViewId] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const current = useMemo(() => findHappeningNow(activities, now), [activities, now])

  if (!current) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setQuickViewId(current.id)}
        className="pointer-events-auto fixed inset-x-0 z-[16] flex justify-center px-3"
        style={{ top: 'calc(var(--scene-h) - 20px)' }}
      >
        <span className="card-shadow inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-coral px-3 py-1 text-xs font-medium text-white">
          <span aria-hidden>●</span>
          <span className="truncate">Happening now: {current.name}</span>
        </span>
      </button>

      {quickViewId && <ActivityQuickView activityId={quickViewId} onClose={() => setQuickViewId(null)} />}
    </>
  )
}
