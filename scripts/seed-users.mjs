// One-time setup script — creates the initial trip roster as auth users with
// password_set = false, so each person can log in with their email and any
// password of their choosing on first visit (see the claim-account Edge
// Function / LoginPage's "choose a password" step).
//
// Needs the SERVICE ROLE key (never the anon key) — run locally, never commit
// the key. Usage:
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/seed-users.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon) first.')
  process.exit(1)
}

const ROSTER = [
  { email: 'mkiser97@gmail.com', isAdmin: true },
  { email: 'graham.alyson08@gmail.com', isAdmin: false },
  { email: 'jmtz779@gmail.com', isAdmin: false },
  { email: 'carmenmgarcia87@gmail.com', isAdmin: false },
  { email: 'saravolfan16@gmail.com', isAdmin: false },
  { email: 'iamchriswilliams074@gmail.com', isAdmin: false },
]

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'trip' },
})

for (const { email, isAdmin } of ROSTER) {
  const { data: existing } = await adminClient
    .from('user_profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    console.log(`skip (already exists): ${email}`)
    if (isAdmin) {
      await adminClient.from('user_profiles').update({ is_admin: true }).eq('id', existing.id)
    }
    continue
  }

  const { data: created, error } = await adminClient.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  })

  if (error || !created.user) {
    console.error(`FAILED: ${email} — ${error?.message}`)
    continue
  }

  if (isAdmin) {
    const { error: adminError } = await adminClient
      .from('user_profiles')
      .update({ is_admin: true })
      .eq('id', created.user.id)
    if (adminError) {
      console.error(`created ${email} but FAILED to set is_admin: ${adminError.message}`)
      continue
    }
  }

  console.log(`created${isAdmin ? ' (admin)' : ''}: ${email}`)
}

console.log('Done. Each person can now sign in with their email and any password to claim their account.')
