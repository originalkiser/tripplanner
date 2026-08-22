import { useAuthStore } from '../../stores/authStore'
import { useActivitiesStore, pendingInvites } from '../../stores/activitiesStore'

// Activity join requests waiting on the current user's response — counted
// alongside pending polls for the Home/nav notification badges.
export function usePendingInviteCount(): number {
  const profile = useAuthStore((s) => s.profile)
  const activities = useActivitiesStore((s) => s.activities)
  if (!profile) return 0
  return pendingInvites(activities, profile.id).length
}
