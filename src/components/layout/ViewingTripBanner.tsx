import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getCurrentTripId } from '../../lib/currentTrip'

// There's no sitewide "active trip" any more — which trip you're looking at
// is a personal choice (lib/currentTrip.ts), and with concurrent trips a
// real possibility, always worth showing rather than only in the rare case
// it disagrees with some shared default. Sits in the top-right corner of
// the fixed hero band itself (not floating over page content) so it never
// competes with a page's own sticky header or the centered
// HappeningNow/Update banners.
export function ViewingTripBanner() {
  const [tripName, setTripName] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const tripId = await getCurrentTripId()
      if (!tripId) {
        setTripName(null)
        return
      }
      const { data } = await supabase.from('trips').select('name').eq('id', tripId).maybeSingle()
      setTripName(data?.name ?? null)
    })()
  }, [])

  if (!tripName) return null

  return (
    <Link
      to="/trips"
      className="pointer-events-auto fixed right-3 z-[16] flex max-w-[45%] items-center gap-1 truncate rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
      style={{ top: 'calc(var(--scene-h) - 28px)' }}
    >
      <span aria-hidden>📍</span>
      <span className="truncate">{tripName}</span>
    </Link>
  )
}
