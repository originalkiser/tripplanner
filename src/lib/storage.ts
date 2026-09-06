const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function tripPhotoUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/trip-photos/${storagePath}`
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi|mkv|3gp)$/i

// Videos keep their original extension on upload (images are always
// re-encoded to .jpg) — cheap enough of a signal that it's not worth a
// dedicated column just to say "this one's a video".
export function isVideoPath(storagePath: string): boolean {
  return VIDEO_EXTENSIONS.test(storagePath)
}
