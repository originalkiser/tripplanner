// Admin-only. Stores the OpenRouteService API key (or any future integration
// secret) in trip.app_settings, which has zero client-facing RLS policies —
// only this service-role function (and `route`) ever touch it.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_KEYS = new Set(['openrouteservice_api_key'])

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

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: 'trip' } })
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()

  if (!caller) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: corsHeaders,
    })
  }

  const { data: callerProfile } = await adminClient
    .from('user_profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .maybeSingle()

  if (!callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
      headers: corsHeaders,
    })
  }

  const { key, value } = await req.json()
  if (!key || !ALLOWED_KEYS.has(key)) {
    return new Response(JSON.stringify({ error: 'Unknown setting key' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const { error } = await adminClient
    .from('app_settings')
    .upsert({ key, value, updated_by: caller.id, updated_at: new Date().toISOString() })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
