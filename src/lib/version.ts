// See vite.config.ts: every production build gets a fresh id, embedded in
// this bundle and also written to an unhashed `version.json` file. Polling
// that file and comparing against our own embedded id is how the app
// notices a newer build has been deployed while it's still open.
export const CURRENT_BUILD_ID = __BUILD_ID__

export async function fetchDeployedBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.id === 'string' ? data.id : null
  } catch {
    return null
  }
}
