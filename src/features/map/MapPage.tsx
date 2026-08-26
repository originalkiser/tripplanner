import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Map as MaplibreMap, Marker, Popup, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { osmRasterStyle, darkRasterStyle } from '../../lib/mapStyle'
import { useActivitiesStore, type Activity } from '../../stores/activitiesStore'
import { useAuthStore } from '../../stores/authStore'
import { googleMapsUrl, appleMapsUrl, isIOS } from '../../lib/geo'
import { fetchRoute, formatDistance, formatDuration, setIntegrationKey } from '../../lib/routing'
import { TRIP_DAYS, dayColor } from '../../lib/days'

const CATEGORY_COLOR: Record<string, string> = {
  savannah: 'var(--color-savannah)',
  tybee: 'var(--color-tybee)',
}

const TYPE_ICON: Record<string, string> = {
  food: '🍴',
  activity: '📍',
  food_and_activity: '★',
}

type FilterKey = 'planned' | 'unplanned' | 'joined' | 'others_joined'

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'planned', label: 'Planned' },
  { key: 'unplanned', label: 'Unplanned' },
  { key: 'joined', label: "I've joined" },
  { key: 'others_joined', label: 'Others joined' },
]

// A located activity is shown if it matches ANY checked category — the four
// categories overlap (a planned stop can also be one you've joined), so this
// is an inclusive OR across whichever boxes are checked, not an AND filter
// narrowing down a single dimension.
function matchesMapFilters(activity: Activity, filters: Set<FilterKey>, userId: string | undefined): boolean {
  const isPlanned = activity.proposed_date != null
  const isJoinedByMe = userId != null && activity.participants.some((p) => p.user_id === userId && p.status === 'joined')
  const isJoinedByOthers = activity.participants.some((p) => p.user_id !== userId && p.status === 'joined')
  return (
    (filters.has('planned') && isPlanned) ||
    (filters.has('unplanned') && !isPlanned) ||
    (filters.has('joined') && isJoinedByMe) ||
    (filters.has('others_joined') && isJoinedByOthers)
  )
}

// The fill still carries category (Savannah/Tybee); the ring is the same
// per-day color used for the halo border on Planned page cards, so pins
// for the same day are recognizable across both views at a glance.
function markerEl(activity: Activity): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '30px'
  el.style.height = '30px'
  el.style.borderRadius = '50%'
  el.style.background = CATEGORY_COLOR[activity.category] ?? '#666'
  el.style.border = `3px solid ${dayColor(activity.proposed_date) ?? '#999'}`
  el.style.boxShadow = '0 0 0 1.5px white, 0 1px 3px rgba(0,0,0,0.4)'
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
  const markersByIdRef = useRef<Map<string, Marker>>(new Map())
  const deepLinkHandledRef = useRef(false)
  const initialActivityIdRef = useRef<string | null>(new URLSearchParams(window.location.search).get('activity'))

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
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light')
  const [filterOpen, setFilterOpen] = useState(false)
  const [mapFilters, setMapFilters] = useState<Set<FilterKey>>(
    () => new Set<FilterKey>(['planned', 'unplanned', 'joined', 'others_joined']),
  )
  const [searchParams] = useSearchParams()

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

  const allLocated = activities.filter((a) => a.location_lat != null && a.location_lng != null)
  const located = allLocated.filter((a) => matchesMapFilters(a, mapFilters, profile?.id))

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    markersByIdRef.current = new Map()

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
      markersByIdRef.current.set(activity.id, marker)
    }

    // Skip the fit-everything zoom when a deep link is about to center on one
    // specific activity instead — otherwise whichever runs second wins the
    // camera, and that's not guaranteed to be the deep link.
    if (initialActivityIdRef.current && !deepLinkHandledRef.current) return

    try {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
    } catch {
      // single point or degenerate bounds — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located.length, routingMode, mapFilters])

  // Deep-link support: `?activity=<id>` (from a card's "View on map" link)
  // selects and centers on that activity once its marker exists.
  useEffect(() => {
    if (deepLinkHandledRef.current) return
    const id = searchParams.get('activity')
    if (!id) return
    const activity = located.find((a) => a.id === id)
    if (!activity) return
    deepLinkHandledRef.current = true
    selectActivity(activity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located.length, searchParams])

  function selectActivity(activity: Activity) {
    setSelectedActivityId(activity.id)
    setSidebarOpen(false)
    const map = mapRef.current
    const marker = markersByIdRef.current.get(activity.id)
    if (map && activity.location_lat != null && activity.location_lng != null) {
      map.flyTo({ center: [activity.location_lng, activity.location_lat], zoom: 15, duration: 600 })
    }
    const popup = marker?.getPopup()
    if (marker && popup && !popup.isOpen()) marker.togglePopup()
  }

  function popupHtml(activity: Activity): string {
    const when = activity.proposed_date
      ? `${formatDate(activity.proposed_date)}${activity.proposed_time ? ` · ${formatTime(activity.proposed_time)}` : ''}`
      : activity.proposed_time
        ? formatTime(activity.proposed_time)
        : 'No time set'
    const gUrl = googleMapsUrl(activity.location_lat!, activity.location_lng!)
    const aUrl = appleMapsUrl(activity.location_lat!, activity.location_lng!)
    const primaryUrl = isIOS() ? aUrl : gUrl
    const secondaryUrl = isIOS() ? gUrl : aUrl
    const primaryLabel = isIOS() ? 'Apple Maps' : 'Google Maps'
    const secondaryLabel = isIOS() ? 'Google Maps' : 'Apple Maps'
    return `
      <div style="font-family:system-ui;min-width:180px;color:#1f2a2e">
        <strong style="color:#1f2a2e">${escapeHtml(activity.name)}</strong><br/>
        <span style="font-size:12px;color:#5c6b6e">${when}</span><br/>
        <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">
          <a href="${primaryUrl}" target="_blank" rel="noreferrer" style="color:#1B7A8C;font-size:12px">Open in ${primaryLabel}</a>
          <a href="${secondaryUrl}" target="_blank" rel="noreferrer" style="color:#1B7A8C;font-size:12px">Open in ${secondaryLabel}</a>
        </div>
      </div>
    `
  }

  function onMarkerClick(activity: Activity) {
    if (routingMode !== 'pair') {
      setSelectedActivityId(activity.id)
      return
    }
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

  function toggleMapTheme() {
    const map = mapRef.current
    if (!map) return
    const next = mapTheme === 'light' ? 'dark' : 'light'
    // setStyle() reloads the whole style (sources/layers), which drops the
    // route line — it's simplest to just clear routing rather than redraw
    // it after the style finishes loading. Markers aren't part of the
    // style (they're plain DOM overlays MapLibre repositions on its own),
    // so they survive the swap untouched.
    if (routingMode !== 'off') stopRouting()
    map.setStyle(next === 'dark' ? darkRasterStyle : osmRasterStyle)
    setMapTheme(next)
  }

  function toggleMapFilter(key: FilterKey) {
    setMapFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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

  const byTime = (a: Activity, b: Activity) => (a.proposed_time ?? 'zz').localeCompare(b.proposed_time ?? 'zz')
  const locatedGroups: { key: string; label: string; color: string | null; items: Activity[] }[] = [
    ...TRIP_DAYS.map((d) => ({
      key: d.date,
      label: d.shortLabel,
      color: d.color,
      items: located.filter((a) => a.proposed_date === d.date).sort(byTime),
    })),
    {
      key: 'unscheduled',
      label: 'Not yet scheduled',
      color: null,
      items: located.filter((a) => !TRIP_DAYS.some((d) => d.date === a.proposed_date)).sort(byTime),
    },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="relative flex h-full">
      <div className="relative flex-1">
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
            onClick={() => setSidebarOpen(true)}
            aria-label="Show locations list"
            className="rounded-lg bg-bg px-2 py-1.5 text-xs font-medium md:hidden"
          >
            <HamburgerIcon />
          </button>
          <button
            type="button"
            onClick={toggleMapTheme}
            aria-label={mapTheme === 'light' ? 'Switch map to dark mode' : 'Switch map to light mode'}
            className="rounded-lg bg-bg px-2 py-1.5 text-xs font-medium"
          >
            {mapTheme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="Filter locations"
            className={`rounded-lg px-2 py-1.5 text-xs font-medium ${filterOpen ? 'bg-primary text-white' : 'bg-bg'}`}
          >
            <FilterIcon />
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

        {filterOpen && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-surface p-2 shadow-md">
            {FILTER_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-1.5 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={mapFilters.has(opt.key)}
                  onChange={() => toggleMapFilter(opt.key)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}

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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-[var(--scene-h)] bottom-0 right-0 z-40 w-72 transform border-l border-line bg-surface shadow-xl transition-transform duration-200 md:relative md:top-0 md:bottom-0 md:z-0 md:translate-x-0 md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line p-3 md:hidden">
          <h2 className="font-heading text-sm font-semibold">Locations</h2>
          <button type="button" onClick={() => setSidebarOpen(false)} className="text-2xl leading-none opacity-60">
            &times;
          </button>
        </div>
        <div className="h-[calc(100svh-var(--scene-h)-64px)] overflow-y-auto p-2">
          {locatedGroups.length === 0 && (
            <p className="p-3 text-xs text-text-dim">
              {allLocated.length === 0 ? 'No located items yet.' : 'No locations match this filter.'}
            </p>
          )}
          {locatedGroups.map((group) => (
            <div key={group.key} className="mb-3">
              <h3 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
                {group.color && (
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: group.color }} />
                )}
                {group.label}
              </h3>
              {group.items.map((a) => {
                const selected = selectedActivityId === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectActivity(a)}
                    className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                      selected ? 'bg-primary text-white' : 'text-text hover:bg-bg'
                    }`}
                  >
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className={`shrink-0 text-[10px] ${selected ? 'text-white/80' : 'text-text-dim'}`}>
                      {a.proposed_time ? formatTime(a.proposed_time) : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5Z" />
    </svg>
  )
}

function formatTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${m} ${ampm}`
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
