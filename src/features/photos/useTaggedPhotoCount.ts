import { useAuthStore } from '../../stores/authStore'
import { usePhotosStore, newTagsSince } from '../../stores/photosStore'
import { usePhotoSeenStore } from '../../stores/photoSeenStore'

// Photos someone else tagged this user in since this device last viewed the
// album — counted alongside pending polls/invites/photos for the Home/nav
// notification badges. Relies on something having already kicked off
// photosStore's fetchAll (see AppShell), so this stays a pure read with no
// effect of its own.
export function useTaggedPhotoCount(): number {
  const profile = useAuthStore((s) => s.profile)
  const all = usePhotosStore((s) => s.all)
  const lastSeenAt = usePhotoSeenStore((s) => s.lastSeenAt)
  if (!profile) return 0
  return newTagsSince(all, profile.id, lastSeenAt).length
}
