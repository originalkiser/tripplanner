// Draws a route between 2+ waypoints via OpenRouteService. Requires an admin
// to have set the ORS key via set-integration-key first; if not,
// responds 200 with { needsSetup: true } so the map UI can show an inline
// "routing isn't set up yet" message instead of a hard error.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: corsHeaders,
    })
  }

  const { waypoints, profile } = await req.json()
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return new Response(JSON.stringify({ error: 'At least 2 waypoints ([lng, lat] pairs) are required' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: 'trip' } })

  const { data: setting } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'openrouteservice_api_key')
    .maybeSingle()

  if (!setting?.value) {
    return new Response(JSON.stringify({ needsSetup: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const orsProfile = profile === 'foot-walking' ? 'foot-walking' : 'driving-car'

  const orsRes = await fetch(
    `https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`,
    {
      method: 'POST',
      headers: {
        Authorization: setting.value,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: waypoints }),
    },
  )

  if (!orsRes.ok) {
    const text = await orsRes.text()
    return new Response(JSON.stringify({ error: `OpenRouteService error: ${text}` }), {
      status: 502,
      headers: corsHeaders,
    })
  }

  const geojson = await orsRes.json()
  const feature = geojson.features?.[0]
  if (!feature) {
    return new Response(JSON.stringify({ error: 'No route found' }), {
      status: 404,
      headers: corsHeaders,
    })
  }

  return new Response(
    JSON.stringify({
      geometry: feature.geometry,
      distanceMeters: feature.properties?.summary?.distance ?? null,
      durationSeconds: feature.properties?.summary?.duration ?? null,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
