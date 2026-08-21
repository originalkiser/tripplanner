// Public, unauthenticated endpoint (called before the user has a session).
// A pre-seeded or invited account starts with password_set = false and an
// unknown random password. This is how that account gets "claimed": the
// first person to enter the right email may set ANY password they like,
// which becomes their real password from then on. Once password_set flips
// to true, this endpoint refuses to touch that account again — from then on
// login goes through the normal signInWithPassword flow, or an admin has to
// reset the account (see admin-reset-password) to reopen this path.

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

  const { email, password } = await req.json()
  if (!email || !password || String(password).length < 6) {
    return new Response(
      JSON.stringify({ error: 'email and a password of at least 6 characters are required' }),
      { status: 400, headers: corsHeaders },
    )
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'trip' },
  })

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, password_set')
    .ilike('email', email)
    .maybeSingle()

  if (!profile) {
    return new Response(JSON.stringify({ error: 'No account found for that email' }), {
      status: 404,
      headers: corsHeaders,
    })
  }

  if (profile.password_set) {
    return new Response(
      JSON.stringify({ error: 'This account already has a password set. Sign in normally.' }),
      { status: 409, headers: corsHeaders },
    )
  }

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(profile.id, {
    password,
  })
  if (updateAuthError) {
    return new Response(JSON.stringify({ error: updateAuthError.message }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const { error: updateProfileError } = await adminClient
    .from('user_profiles')
    .update({ password_set: true })
    .eq('id', profile.id)
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
