import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getStoredCurrentTripId, setCurrentTripId } from '../../lib/currentTrip'

// Shown only when this person has explicitly switched to browsing a trip
// other than the one that's sitewide-active (see MyTripsPage's "View" button
// and lib/currentTrip.ts) — otherwise invisible, since "viewing" and
// "active" agree for everyone who hasn't switched.
export function ViewingTripBanner() {
  const [state, setState] = useState<{ viewingName: string; activeName: string } | null>(null)

  useEffect(() => {
    void (async () => {
      const chosen = getStoredCurrentTripId()
      if (!chosen) {
        setState(null)
        return
      }
      const [{ data: active }, { data: viewing }] = await Promise.all([
        supabase.from('trips').select('id, name').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('trips').select('name').eq('id', chosen).maybeSingle(),
      ])
      if (!active || !viewing || active.id === chosen) {
        setState(null)
        return
      }
      setState({ viewingName: viewing.name, activeName: active.name })
    })()
  }, [])

  if (!state) return null

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ top: 'calc(var(--scene-h) + 44px)' }}
    >
      <div className="card-shadow flex max-w-full items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-white">
        <span className="truncate">Viewing "{state.viewingName}" — not your active trip</span>
        <button
          type="button"
          onClick={() => setCurrentTripId(null)}
          className="shrink-0 rounded-full bg-white/25 px-2 py-0.5"
        >
          Back to {state.activeName}
        </button>
      </div>
    </div>
  )
}
