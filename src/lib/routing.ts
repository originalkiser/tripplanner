import { supabase } from './supabase'

export interface RouteGeometry {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface RouteResult {
  geometry: RouteGeometry
  distanceMeters: number | null
  durationSeconds: number | null
}

export async function fetchRoute(
  waypoints: [number, number][],
): Promise<{ route: RouteResult | null; needsSetup: boolean; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('route', {
    body: { waypoints },
    headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
  })

  if (error) return { route: null, needsSetup: false, error: error.message }
  if (data?.needsSetup) return { route: null, needsSetup: true, error: null }
  if (!data?.geometry) return { route: null, needsSetup: false, error: 'No route returned' }

  return {
    route: {
      geometry: data.geometry,
      distanceMeters: data.distanceMeters ?? null,
      durationSeconds: data.durationSeconds ?? null,
    },
    needsSetup: false,
    error: null,
  }
}

export async function setIntegrationKey(key: string, value: string): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const { error } = await supabase.functions.invoke('set-integration-key', {
    body: { key, value },
    headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
  })
  return { error: error?.message ?? null }
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34
  return `${miles.toFixed(1)} mi`
}
