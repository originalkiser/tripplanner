// Static string src attributes (unlike imported assets) aren't rewritten by
// Vite's build `base` path, so a hardcoded "/avatars/x.svg" 404s once the
// production build is served from a subpath. Stored avatar_url values are
// always the canonical "/avatars/x.svg" form (that's what presetAvatars.ts
// and the DB hold); full URLs (custom-uploaded photos, Supabase Storage)
// pass through untouched.
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
