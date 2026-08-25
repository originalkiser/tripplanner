import { useAuthStore } from '../../stores/authStore'
import { usePollsStore, pendingPolls } from '../../stores/pollsStore'

// Polls that still need a vote from the current user — the count shown as a
// badge on the bottom-nav Home button and the Home page's Notifications
// quick action. Relies on NotificationStack (always mounted in AppShell)
// to have already kicked off the fetch, so this stays a pure read with no
// effect of its own.
export function usePendingPollCount(): number {
  const profile = useAuthStore((s) => s.profile)
  const all = usePollsStore((s) => s.all)
  if (!profile) return 0
  return pendingPolls(all, profile.id).length
}
