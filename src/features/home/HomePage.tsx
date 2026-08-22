import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

interface Stay {
  trip_id: string
  name: string | null
  address: string | null
  notes: string | null
  link_url: string | null
  updated_by: string | null
  updated_at: string
}

export function HomePage() {
  const profile = useAuthStore((s) => s.profile)
  const [stay, setStay] = useState<Stay | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: trip } = await supabase.from('trips').select('id').eq('is_active', true).limit(1).maybeSingle()
    if (!trip) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('stays').select('*').eq('trip_id', trip.id).maybeSingle()
    if (data) {
      setStay(data)
      setName(data.name ?? '')
      setAddress(data.address ?? '')
      setNotes(data.notes ?? '')
      setLinkUrl(data.link_url ?? '')
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

    const { error } = await supabase.from('stays').upsert({
      trip_id: trip.id,
      name: name.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      link_url: linkUrl.trim() || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(false)
    await load()
  }

  if (loading) {
    return <div className="p-4 text-sm text-text-dim">Loading…</div>
  }

  const hasDetails = stay && (stay.name || stay.address || stay.notes || stay.link_url)

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Home</h1>
      <p className="mt-1 text-sm text-text-dim">Where the group is staying — anyone can edit this.</p>

      {!editing && hasDetails && (
        <div className="card-shadow mt-4 rounded-xl border border-line bg-surface p-4">
          {stay!.name && <h2 className="font-heading text-lg font-semibold">{stay!.name}</h2>}
          {stay!.address && <p className="mt-1 text-sm text-text-dim">{stay!.address}</p>}
          {stay!.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{stay!.notes}</p>}
          {stay!.link_url && (
            <a href={stay!.link_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-primary underline">
              View link
            </a>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            Edit
          </button>
        </div>
      )}

      {!editing && !hasDetails && (
        <div className="card-shadow mt-4 rounded-xl border border-dashed border-line bg-surface p-4 text-center">
          <p className="text-sm text-text-dim">Nobody's added where we're staying yet.</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            Add stay details
          </button>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="card-shadow mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            placeholder="Name (e.g. The Marshall House)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <textarea
            placeholder="Notes (check-in time, door code, parking, whatever's useful)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
          <input
            type="url"
            placeholder="Link (booking confirmation, listing, etc.)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
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
