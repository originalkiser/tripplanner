import type { Activity } from '../stores/activitiesStore'

function localIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Whichever scheduled activity's [start, start + duration) window contains
// `now`, comparing against the device's local wall-clock time — proposed
// dates/times are entered as plain local values, not UTC, so that's the
// only comparison that lines up with what someone actually typed in.
export function findHappeningNow(activities: Activity[], now: Date): Activity | null {
  const today = localIsoDate(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (const activity of activities) {
    if (activity.proposed_date !== today || !activity.proposed_time) continue
    const [h, m] = activity.proposed_time.split(':').map(Number)
    const startMinutes = h * 60 + m
    const endMinutes = startMinutes + (activity.duration_minutes ?? 60)
    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return activity
  }
  return null
}
