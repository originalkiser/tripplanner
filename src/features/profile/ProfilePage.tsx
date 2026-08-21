import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { PRESET_AVATARS } from './presetAvatars'
import { getStoredTheme, setTheme, type ThemePreference } from '../../lib/theme'

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const signOut = useAuthStore((s) => s.signOut)

  const [themePref, setThemePref] = useState<ThemePreference>(getStoredTheme())

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [nameStatus, setNameStatus] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [savingAvatar, setSavingAvatar] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  if (!profile) {
    return <div className="p-4 text-sm opacity-70">Setting up your profile…</div>
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameStatus(null)
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', profile!.id)
    setSavingName(false)
    setNameStatus(error ? `Error: ${error.message}` : 'Saved.')
    if (!error) await refreshProfile()
  }

  async function pickAvatar(path: string) {
    setSavingAvatar(path)
    const { error } = await supabase
      .from('user_profiles')
      .update({ avatar_url: path, avatar_type: 'preset' })
      .eq('id', profile!.id)
    setSavingAvatar(null)
    if (error) alert(`Error: ${error.message}`)
    else await refreshProfile()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordStatus(null)

    if (newPassword.length < 6) {
      setPasswordStatus('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords don't match.")
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)

    if (error) {
      setPasswordStatus(`Error: ${error.message}`)
      return
    }
    setPasswordStatus('Password updated.')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-8">
      <h1 className="text-2xl font-semibold text-primary">Profile</h1>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Appearance</h2>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => {
                setThemePref(pref)
                setTheme(pref)
              }}
              className={`flex-1 rounded-lg py-1.5 text-sm capitalize ${
                themePref === pref ? 'bg-primary text-white' : 'bg-bg text-text'
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Avatar</h2>
        <div className="grid grid-cols-4 gap-3">
          {PRESET_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => void pickAvatar(avatar.path)}
              disabled={savingAvatar === avatar.path}
              aria-label={avatar.label}
              className={`rounded-full ring-2 transition disabled:opacity-50 ${
                profile.avatar_url === avatar.path
                  ? 'ring-primary'
                  : 'ring-transparent hover:ring-secondary/40'
              }`}
            >
              <img src={avatar.path} alt={avatar.label} className="h-14 w-14" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Name</h2>
        <form onSubmit={saveName} className="flex flex-col gap-3">
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-secondary/30 bg-bg px-3 py-2"
          />
          <button
            type="submit"
            disabled={savingName}
            className="self-start rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {savingName ? 'Saving…' : 'Save name'}
          </button>
          {nameStatus && <p className="text-sm">{nameStatus}</p>}
        </form>
      </section>

      <section className="mt-4 rounded-xl bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Password</h2>
        <form onSubmit={changePassword} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-lg border border-secondary/30 bg-bg px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-lg border border-secondary/30 bg-bg px-3 py-2"
          />
          <button
            type="submit"
            disabled={savingPassword}
            className="self-start rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
          {passwordStatus && <p className="text-sm">{passwordStatus}</p>}
        </form>
      </section>

      <Link
        to="/people"
        className="mt-4 block rounded-xl bg-surface p-4 text-sm font-medium text-primary shadow-sm"
      >
        Trip members &rarr;
      </Link>

      <Link
        to="/album"
        className="mt-3 block rounded-xl bg-surface p-4 text-sm font-medium text-primary shadow-sm"
      >
        Trip Album &rarr;
      </Link>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white"
      >
        Sign out
      </button>
    </div>
  )
}
