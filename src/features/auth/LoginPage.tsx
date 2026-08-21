import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

type Step = 'email' | 'claim' | 'password'

export function LoginPage() {
  const status = useAuthStore((s) => s.status)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setStep('email')
  }

  async function checkEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.rpc('check_login_email', {
      check_email: email.trim(),
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    if (!data?.exists) {
      setError('No account found for that email. Ask someone on the trip to add you.')
      return
    }
    setStep(data.needs_setup ? 'claim' : 'password')
  }

  async function claimAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const { error: claimError } = await supabase.functions.invoke('claim-account', {
      body: { email: email.trim(), password },
    })

    if (claimError) {
      setLoading(false)
      setError(claimError.message)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (signInError) setError(signInError.message)
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  if (status === 'signed_in') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bg px-6 text-text">
      <h1 className="text-3xl font-semibold text-primary">Trip Planner</h1>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {step === 'email' && (
          <form onSubmit={checkEmail} className="flex flex-col gap-3">
            <input
              type="email"
              required
              autoFocus
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-3 font-medium text-white shadow-sm disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'claim' && (
          <form onSubmit={claimAccount} className="flex flex-col gap-3">
            <p className="text-xs opacity-70">
              First time signing in as <span className="font-medium">{email}</span>. Choose a
              password.{' '}
              <button type="button" onClick={reset} className="underline">
                Not you?
              </button>
            </p>
            <input
              type="password"
              required
              autoFocus
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2"
            />
            <input
              type="password"
              required
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Setting up…' : 'Set password & sign in'}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
            <p className="text-xs opacity-70">
              Signing in as <span className="font-medium">{email}</span>.{' '}
              <button type="button" onClick={reset} className="underline">
                Not you?
              </button>
            </p>
            <input
              type="password"
              required
              autoFocus
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
