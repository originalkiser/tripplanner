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

export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (query.trim().length < 3) return []

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', `${query}, Savannah, GA`)
  url.searchParams.set('limit', '5')

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
