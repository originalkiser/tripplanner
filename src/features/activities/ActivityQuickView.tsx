import { useEffect } from 'react'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { ActivityCard } from './ActivityCard'

// A lightweight modal wrapper around ActivityCard, used anywhere we want to
// show one activity's full detail without navigating away from the current
// screen (digest entries, calendar view). Passing the activity's own id as
// `highlightId` reuses ActivityCard's existing auto-expand behavior.
export function ActivityQuickView({ activityId, onClose }: { activityId: string; onClose: () => void }) {
  const activity = useActivitiesStore((s) => s.activities.find((a) => a.id === activityId))
  const loading = useActivitiesStore((s) => s.loading)
  const fetchActivities = useActivitiesStore((s) => s.fetchActivities)

  useEffect(() => {
    if (!activity) void fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-bg p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="text-2xl leading-none opacity-60">
            &times;
          </button>
        </div>
        {activity ? (
          <ActivityCard activity={activity} highlightId={activityId} />
        ) : (
          <p className="p-4 text-center text-sm text-text-dim">{loading ? 'Loading…' : "Couldn't find that activity."}</p>
        )}
      </div>
    </div>
  )
}
