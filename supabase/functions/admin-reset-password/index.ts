// Admin-only. Can't literally set a password to null (Auth requires one), so
// this sets an unknown random password and flips password_set back to
// false — same effect: the account is locked out until someone runs the
// claim-account flow again with the target's email and any password of
// their choosing.

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

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'trip' },
  })

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

  const { userId } = await req.json()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
    password: randomPlaceholderPassword(),
  })
  if (updateAuthError) {
    return new Response(JSON.stringify({ error: updateAuthError.message }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const { error: updateProfileError } = await adminClient
    .from('user_profiles')
    .update({ password_set: false })
    .eq('id', userId)
  if (updateProfileError) {
    return new Response(JSON.stringify({ error: updateProfileError.message }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
