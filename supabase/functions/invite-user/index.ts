// Lets any signed-in trip member add someone else's email so that person can
// get into the app. No admin gate — everyone has equal standing here. The
// new account is created with a random password nobody knows and
// password_set = false, so the invitee just uses the normal claim-account
// flow (any password, first login) to get in.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function randomPlaceholderPassword() {
  return crypto.randomUUID()
}

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

  const { email, displayName } = await req.json()
  if (!email) {
    return new Response(JSON.stringify({ error: 'email is required' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'trip' },
  })

  const { data: existing } = await adminClient
    .from('user_profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ error: 'That email is already on the trip' }), {
      status: 409,
      headers: corsHeaders,
    })
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: randomPlaceholderPassword(),
    email_confirm: true,
    user_metadata: displayName ? { full_name: displayName } : undefined,
  })

  if (createError || !created.user) {
    return new Response(JSON.stringify({ error: createError?.message ?? 'Create failed' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  if (displayName) {
    await adminClient
      .from('user_profiles')
      .update({ display_name: displayName })
      .eq('id', created.user.id)
  }

  return new Response(JSON.stringify({ ok: true, userId: created.user.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
