import type { ActivityCategory } from '../types/database'

export const CATEGORY_BOUNDS: Record<ActivityCategory, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  savannah: { minLat: 31.9, maxLat: 32.1, minLng: -81.2, maxLng: -81.0 },
  tybee: { minLat: 31.94, maxLat: 32.05, minLng: -80.87, maxLng: -80.82 },
}

export function categoryFromLatLng(lat: number, lng: number): ActivityCategory {
  const tybee = CATEGORY_BOUNDS.tybee
  if (lat >= tybee.minLat && lat <= tybee.maxLat && lng >= tybee.minLng && lng <= tybee.maxLng) {
    return 'tybee'
  }
  return 'savannah'
}

export interface LocationResult {
  displayName: string
  lat: number
  lng: number
  placeId: string
}

// Covers both Savannah and Tybee, used to bias (not restrict) search results
// toward the local area — see searchLocations for why this replaced
// appending ", Savannah, GA" to the query text.
const LOCAL_BOUNDS = {
  minLat: Math.min(CATEGORY_BOUNDS.savannah.minLat, CATEGORY_BOUNDS.tybee.minLat),
  maxLat: Math.max(CATEGORY_BOUNDS.savannah.maxLat, CATEGORY_BOUNDS.tybee.maxLat),
  minLng: Math.min(CATEGORY_BOUNDS.savannah.minLng, CATEGORY_BOUNDS.tybee.minLng),
  maxLng: Math.max(CATEGORY_BOUNDS.savannah.maxLng, CATEGORY_BOUNDS.tybee.maxLng),
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (query.trim().length < 3) return []

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '8')
  // Appending a fixed ", Savannah, GA" to every query broke named-place
  // search: typing something already containing an area name (e.g.
  // "Stingray's Seafood, Tybee") produced a self-contradicting address
  // ("...Tybee, Savannah, GA") that Nominatim's address parser couldn't
  // resolve, so business/POI names came back sparse or empty. A viewbox
  // bias (not a hard filter — bounded=0 is the default) nudges ranking
  // toward the local area without touching what the person actually typed.
  url.searchParams.set(
    'viewbox',
    `${LOCAL_BOUNDS.minLng},${LOCAL_BOUNDS.maxLat},${LOCAL_BOUNDS.maxLng},${LOCAL_BOUNDS.minLat}`,
  )

  const res = await fetch(url)
  if (!res.ok) return []
  const results: Array<{ display_name: string; lat: string; lon: string; place_id: number }> =
    await res.json()

  return results.map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    placeId: String(r.place_id),
  }))
}

// Best-effort place name for a coordinate pair (e.g. a photo's EXIF GPS) —
// null on any failure, since this is always just a suggestion the caller
// can fall back past or let someone overwrite.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('zoom', '18')

    const res = await fetch(url)
    if (!res.ok) return null
    const result: { display_name?: string; name?: string } = await res.json()
    return result.name || result.display_name || null
  } catch {
    return null
  }
}

const EARTH_RADIUS_MILES = 3958.8

// Great-circle (haversine) distance between two points, in miles.
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`
}

export function appleMapsUrl(lat: number, lng: number): string {
  return `https://maps.apple.com/?q=${lat},${lng}`
}

// Free-text variant for places that only have an address on file, not
// coordinates — e.g. the Home page's "where we're staying" field.
export function googleMapsAddressUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

export function appleMapsAddressUrl(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}
