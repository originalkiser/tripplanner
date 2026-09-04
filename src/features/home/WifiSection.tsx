import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { WifiSecurity } from '../../types/database'

interface Wifi {
  trip_id: string
  ssid: string | null
  password: string | null
  security: WifiSecurity
  updated_by: string | null
  updated_at: string
}

// Escape per the WIFI: QR code convention — a backslash before any
// character that's otherwise a field/record separator in the payload.
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

function buildWifiPayload(ssid: string, password: string, security: WifiSecurity): string {
  const type = security === 'nopass' ? 'nopass' : security
  const pass = security === 'nopass' ? '' : `P:${escapeWifiField(password)};`
  return `WIFI:T:${type};S:${escapeWifiField(ssid)};${pass};`
}

export function WifiSection() {
  const profile = useAuthStore((s) => s.profile)
  const [wifi, setWifi] = useState<Wifi | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [security, setSecurity] = useState<WifiSecurity>('WPA')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!showQr || !wifi?.ssid) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(buildWifiPayload(wifi.ssid, wifi.password ?? '', wifi.security), {
      width: 220,
      margin: 1,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [showQr, wifi])

  async function load() {
    setLoading(true)
    const { data: trip } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
    if (!trip) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('wifi_networks').select('*').eq('trip_id', trip.id).maybeSingle()
    if (data) {
      setWifi(data)
      setSsid(data.ssid ?? '')
      setPassword(data.password ?? '')
      setSecurity(data.security)
    }
    setLoading(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)

    const { data: trip } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
    if (!trip) {
      setSaving(false)
      setError('No active trip found.')
      return
    }

    const { error } = await supabase.from('wifi_networks').upsert({
      trip_id: trip.id,
      ssid: ssid.trim() || null,
      password: password.trim() || null,
      security,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(false)
    setShowQr(false)
    await load()
  }

  async function copyPassword() {
    if (!wifi?.password) return
    try {
      await navigator.clipboard.writeText(wifi.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) —
      // the password is still shown on screen for manual copy.
    }
  }

  if (loading) return null

  const hasDetails = wifi && wifi.ssid

  return (
    <div className="mt-4">
      <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim">WiFi</h2>

      {!editing && hasDetails && (
        <div className="card-shadow rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-text-dim">Network</p>
              <h3 className="font-heading text-lg font-semibold">{wifi!.ssid}</h3>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-full bg-bg px-3 py-1 text-xs font-medium text-primary"
            >
              Edit
            </button>
          </div>

          {wifi!.password && (
            <div className="mt-3 flex items-center gap-2">
              <p className="text-xs font-medium text-text-dim">Password</p>
              <code className="font-data flex-1 rounded-lg bg-bg px-2 py-1 text-sm">{wifi!.password}</code>
              <button
                type="button"
                onClick={() => void copyPassword()}
                className="shrink-0 rounded-lg bg-bg px-3 py-1.5 text-xs font-medium text-primary"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            {showQr ? 'Hide QR code' : 'Show QR code to scan'}
          </button>

          {showQr && qrDataUrl && (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-xl bg-bg p-4">
              <img src={qrDataUrl} alt={`QR code to join WiFi network ${wifi!.ssid}`} width={220} height={220} />
              <p className="text-center text-xs text-text-dim">Scan with your phone's camera to connect</p>
            </div>
          )}
        </div>
      )}

      {!editing && !hasDetails && (
        <div className="card-shadow rounded-xl border border-dashed border-line bg-surface p-4 text-center">
          <p className="text-sm text-text-dim">Nobody's added the WiFi details yet.</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            Add WiFi details
          </button>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="card-shadow flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            placeholder="Network name (SSID)"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <select
            value={security}
            onChange={(e) => setSecurity(e.target.value as WifiSecurity)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          >
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">No password</option>
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-coral px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl bg-bg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
