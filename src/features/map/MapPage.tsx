import { useEffect, useRef, useState } from 'react'
import { Map as MaplibreMap, Marker, Popup, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { osmRasterStyle } from '../../lib/mapStyle'
import { useActivitiesStore, type Activity } from '../../stores/activitiesStore'
import { useAuthStore } from '../../stores/authStore'
import { googleMapsUrl, appleMapsUrl, isIOS } from '../../lib/geo'
import { fetchRoute, formatDistance, formatDuration, setIntegrationKey } from '../../lib/routing'
import { TRIP_DAYS } from '../../lib/days'

const CATEGORY_COLOR: Record<string, string> = {
  savannah: 'var(--color-savannah)',
  tybee: 'var(--color-tybee)',
}

const TYPE_ICON: Record<string, string> = {
  food: '🍴',
  activity: '📍',
  food_and_activity: '★',
}

function markerEl(activity: Activity): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '30px'
  el.style.height = '30px'
  el.style.borderRadius = '50%'
  el.style.background = CATEGORY_COLOR[activity.category] ?? '#666'
  el.style.border = '2px solid white'
  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.fontSize = '14px'
  el.style.cursor = 'pointer'
  el.textContent = TYPE_ICON[activity.type] ?? '📍'
  return el
}

export function MapPage() {
  const profile = useAuthStore((s) => s.profile)
  const { activities, fetchActivities } = useActivitiesStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])

  const todayIso = new Date().toISOString().slice(0, 10)
  const todayInRange = TRIP_DAYS.some((d) => d.date === todayIso)

  const [routingMode, setRoutingMode] = useState<'off' | 'day' | 'pair'>('off')
  const [selectedDay, setSelectedDay] = useState(todayInRange ? todayIso : TRIP_DAYS[0].date)
  const [showDatePicker, setShowDatePicker] = useState(!todayInRange)
  const [pairSelection, setPairSelection] = useState<Activity[]>([])
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  const [routeNeedsSetup, setRouteNeedsSetup] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [orsKeyInput, setOrsKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = new MaplibreMap({
      container: containerRef.current,
      style: osmRasterStyle,
      center: [-81.05, 32.0],
      zoom: 11,
    })
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  const located = activities.filter((a) => a.location_lat != null && a.location_lng != null)

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (located.length === 0) return

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...located.map((a) => a.location_lng!)), Math.min(...located.map((a) => a.location_lat!))],
      [Math.max(...located.map((a) => a.location_lng!)), Math.max(...located.map((a) => a.location_lat!))],
    ]

    for (const activity of located) {
      const el = markerEl(activity)
      el.addEventListener('click', () => onMarkerClick(activity))

      const popup = new Popup({ offset: 20 }).setHTML(popupHtml(activity))
      const marker = new Marker({ element: el })
        .setLngLat([activity.location_lng!, activity.location_lat!])
        .setPopup(popup)
        .addTo(map)
      markersRef.current.push(marker)
    }

    try {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
    } catch {
      // single point or degenerate bounds — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located.length, routingMode])

  function popupHtml(activity: Activity): string {
    const time = activity.proposed_time ? formatTime(activity.proposed_time) : 'No time set'
    const gUrl = googleMapsUrl(activity.location_lat!, activity.location_lng!)
    const aUrl = appleMapsUrl(activity.location_lat!, activity.location_lng!)
    const primaryUrl = isIOS() ? aUrl : gUrl
    const secondaryUrl = isIOS() ? gUrl : aUrl
    const primaryLabel = isIOS() ? 'Apple Maps' : 'Google Maps'
    const secondaryLabel = isIOS() ? 'Google Maps' : 'Apple Maps'
    return `
      <div style="font-family:system-ui;min-width:180px">
        <strong>${escapeHtml(activity.name)}</strong><br/>
        <span style="font-size:12px;opacity:0.7">${time}</span><br/>
        <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">
          <a href="${primaryUrl}" target="_blank" rel="noreferrer" style="color:#1B7A8C;font-size:12px">Open in ${primaryLabel}</a>
          <a href="${secondaryUrl}" target="_blank" rel="noreferrer" style="color:#1B7A8C;font-size:12px">Open in ${secondaryLabel}</a>
        </div>
      </div>
    `
  }

  function onMarkerClick(activity: Activity) {
    if (routingMode !== 'pair') return
    setPairSelection((prev) => {
      const next = prev.find((a) => a.id === activity.id)
        ? prev.filter((a) => a.id !== activity.id)
        : [...prev, activity].slice(-2)
      return next
    })
  }

  useEffect(() => {
    if (routingMode === 'pair' && pairSelection.length === 2) {
      void runRoute(pairSelection)
    }
  }, [pairSelection, routingMode])

  async function runRouteForDay(dateOverride?: string) {
    const targetDate = dateOverride ?? selectedDay
    const dayActivities = located
      .filter((a) => a.proposed_date === targetDate)
      .sort((a, b) => (a.proposed_time ?? '').localeCompare(b.proposed_time ?? ''))
    if (dayActivities.length < 2) {
      setRouteError('Need at least 2 located stops that day to draw a route.')
      return
    }
    await runRoute(dayActivities)
  }

  async function runRoute(stops: Activity[]) {
    setRouteError(null)
    setRouteNeedsSetup(false)
    setRouteInfo(null)
    clearRouteLayer()

    const waypoints: [number, number][] = stops.map((a) => [a.location_lng!, a.location_lat!])
    const { route, needsSetup, error } = await fetchRoute(waypoints)

    if (needsSetup) {
      setRouteNeedsSetup(true)
      return
    }
    if (error || !route) {
      setRouteError(error ?? 'Could not compute a route.')
      return
    }

    setRouteInfo({ distance: route.distanceMeters ?? 0, duration: route.durationSeconds ?? 0 })
    drawRouteLayer(route.geometry.coordinates)
  }

  function drawRouteLayer(coords: [number, number][]) {
    const map = mapRef.current
    if (!map) return
    const geojson = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: coords },
    }
    if (map.getSource('route')) {
      ;(map.getSource('route') as GeoJSONSource).setData(geojson)
    } else {
      map.addSource('route', { type: 'geojson', data: geojson })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#E8A96B', 'line-width': 4 },
      })
    }
  }

  function clearRouteLayer() {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('route-line')) map.removeLayer('route-line')
    if (map.getSource('route')) map.removeSource('route')
  }

  function stopRouting() {
    setRoutingMode('off')
    setPairSelection([])
    setRouteInfo(null)
    setRouteError(null)
    setRouteNeedsSetup(false)
    clearRouteLayer()
  }

  function toggleRoutingMode(mode: 'day' | 'pair') {
    if (routingMode === mode) {
      stopRouting()
      return
    }
    setRoutingMode(mode)
    setPairSelection([])
  }

  async function saveOrsKey(e: React.FormEvent) {
    e.preventDefault()
    setSavingKey(true)
    const { error } = await setIntegrationKey('openrouteservice_api_key', orsKeyInput.trim())
    setSavingKey(false)
    if (error) {
      setRouteError(error)
      return
    }
    setOrsKeyInput('')
    setRouteNeedsSetup(false)
    if (routingMode === 'day') await runRouteForDay()
    else if (pairSelection.length === 2) await runRoute(pairSelection)
  }

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-[calc(100svh-64px)] w-full" />

      <div className="absolute left-2 right-2 top-2 flex flex-col gap-2">
        <div className="flex gap-2 rounded-xl bg-surface p-2 shadow-md">
          <button
            type="button"
            onClick={() => toggleRoutingMode('day')}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
              routingMode === 'day' ? 'bg-primary text-white' : 'bg-bg'
            }`}
          >
            Route today's stops
          </button>
          <button
            type="button"
            onClick={() => toggleRoutingMode('pair')}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
              routingMode === 'pair' ? 'bg-primary text-white' : 'bg-bg'
            }`}
          >
            Route between 2 pins
          </button>
        </div>

        {routingMode === 'day' && (
          <div className="flex flex-col gap-2 rounded-xl bg-surface p-2 shadow-md">
            <div className="flex gap-2">
              {todayInRange && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(todayIso)
                    setShowDatePicker(false)
                    void runRouteForDay(todayIso)
                  }}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                    !showDatePicker ? 'bg-primary text-white' : 'bg-bg'
                  }`}
                >
                  Show today
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                  showDatePicker ? 'bg-primary text-white' : 'bg-bg'
                }`}
              >
                Pick date
              </button>
            </div>
            {showDatePicker && (
              <div className="flex gap-2">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm"
                >
                  {TRIP_DAYS.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.shortLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void runRouteForDay()}
                  className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-white"
                >
                  Draw
                </button>
              </div>
            )}
          </div>
        )}

        {routingMode === 'pair' && pairSelection.length < 2 && (
          <p className="rounded-xl bg-surface px-3 py-2 text-xs shadow-md">
            Tap two pins to route between them ({pairSelection.length}/2 selected)
          </p>
        )}

        {routeInfo && (
          <p className="rounded-xl bg-surface px-3 py-2 text-sm shadow-md">
            {formatDistance(routeInfo.distance)} · {formatDuration(routeInfo.duration)}
          </p>
        )}

        {routeError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 shadow-md">{routeError}</p>
        )}

        {routeNeedsSetup && !profile?.is_admin && (
          <p className="rounded-xl bg-surface px-3 py-2 text-xs shadow-md">
            Routing isn't set up yet.
          </p>
        )}

        {routeNeedsSetup && profile?.is_admin && (
          <form onSubmit={saveOrsKey} className="flex flex-col gap-2 rounded-xl bg-surface p-3 text-xs shadow-md">
            <p>
              Routing needs a free API key.{' '}
              <a
                href="https://openrouteservice.org/dev/#/signup"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Get one at openrouteservice.org
              </a>{' '}
              and paste it below.
            </p>
            <div className="flex gap-2">
              <input
                required
                type="password"
                placeholder="ORS API key"
                value={orsKeyInput}
                onChange={(e) => setOrsKeyInput(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-bg px-2 py-1"
              />
              <button
                type="submit"
                disabled={savingKey}
                className="rounded-lg bg-primary px-3 py-1 font-medium text-white disabled:opacity-50"
              >
                {savingKey ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {routingMode !== 'off' && (
          <button
            type="button"
            onClick={stopRouting}
            className="self-start rounded-lg bg-surface px-3 py-1 text-xs shadow-md"
          >
            Cancel routing
          </button>
        )}
      </div>
    </div>
  )
}

function formatTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${m} ${ampm}`
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
