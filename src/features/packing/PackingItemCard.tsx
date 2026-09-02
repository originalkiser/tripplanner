import { useState } from 'react'
import { usePackingStore, type PackingItem } from '../../stores/packingStore'
import { resolveAssetUrl } from '../../lib/assetUrl'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

const FALLBACK_AVATAR = resolveAssetUrl('/avatars/starfish.svg')!

export function PackingItemCard({
  item,
  listId,
  userId,
  members,
  accent,
}: {
  item: PackingItem
  listId: string
  userId: string
  members: Member[]
  // 'private' mode uses coral accents instead of the default primary teal,
  // so the two list types read as visually distinct, not just labeled
  // differently (per the toggle at the top of the page).
  accent: 'primary' | 'coral'
}) {
  const { addBringer, removeBringer, requestBringer, acceptBringRequest, softDeleteItem } = usePackingStore()
  const [busy, setBusy] = useState(false)
  const [bringQty, setBringQty] = useState(1)
  const [showAsk, setShowAsk] = useState(false)
  const [askUserId, setAskUserId] = useState('')
  const [askQty, setAskQty] = useState(1)

  const confirmed = item.bringers.filter((b) => b.status === 'confirmed')
  const covered = confirmed.reduce((sum, b) => sum + b.quantity, 0)
  const needed = item.quantity_needed
  const isFull = needed != null && covered >= needed
  const mine = item.bringers.find((b) => b.user_id === userId)
  const myRequest = mine?.status === 'requested' ? mine : undefined
  const iAmBringing = mine?.status === 'confirmed'

  const askCandidates = members.filter(
    (m) => !item.bringers.some((b) => b.user_id === m.id && b.status === 'confirmed'),
  )

  const accentText = accent === 'coral' ? 'text-coral' : 'text-primary'
  const accentBtn = accent === 'coral' ? 'bg-coral text-white' : 'bg-primary text-white'

  async function handleBring() {
    setBusy(true)
    await addBringer(item.id, listId, userId, bringQty)
    setBusy(false)
  }

  async function handleRemove() {
    setBusy(true)
    await removeBringer(item.id, listId, userId)
    setBusy(false)
  }

  async function handleAccept() {
    setBusy(true)
    await acceptBringRequest(item.id, listId, userId)
    setBusy(false)
  }

  async function handleDecline() {
    setBusy(true)
    await removeBringer(item.id, listId, userId)
    setBusy(false)
  }

  async function handleAsk() {
    if (!askUserId) return
    setBusy(true)
    await requestBringer(item.id, listId, askUserId, userId, askQty)
    setBusy(false)
    setShowAsk(false)
    setAskUserId('')
    setAskQty(1)
  }

  async function handleDelete() {
    setBusy(true)
    await softDeleteItem(item.id, listId, userId)
    setBusy(false)
  }

  return (
    <div className="card-shadow rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-text-dim">
            {needed == null
              ? covered > 0
                ? `${covered} bringing (no limit)`
                : 'No limit needed'
              : `${covered}/${needed} covered`}
            {isFull && ' ✓'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={busy}
          aria-label="Delete item"
          title="Delete item"
          className="shrink-0 text-text-dim opacity-60 hover:opacity-100"
        >
          <TrashIcon />
        </button>
      </div>

      {confirmed.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {confirmed.map((b) => (
            <li key={b.user_id} className="flex items-center gap-2 text-sm">
              <img
                src={resolveAssetUrl(b.profile?.avatar_url) ?? FALLBACK_AVATAR}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
              {b.profile?.display_name}
              {b.quantity > 1 && <span className="text-text-dim">×{b.quantity}</span>}
            </li>
          ))}
        </ul>
      )}

      {myRequest && (
        <div className={`mt-2 rounded-lg px-2 py-1.5 text-xs ${accent === 'coral' ? 'bg-coral/10' : 'bg-secondary/10'}`}>
          <p className="mb-1.5">You were asked to bring this.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={busy}
              className={`rounded-full px-3 py-1 text-xs font-medium ${accentBtn} disabled:opacity-50`}
            >
              I'll bring it
            </button>
            <button
              type="button"
              onClick={() => void handleDecline()}
              disabled={busy}
              className="rounded-full bg-bg px-3 py-1 text-xs font-medium"
            >
              No thanks
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {iAmBringing ? (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={busy}
            className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
          >
            I'm not bringing this anymore
          </button>
        ) : (
          !myRequest && (
            <div className="flex items-center gap-1.5">
              {needed == null && (
                <input
                  type="number"
                  min={1}
                  value={bringQty}
                  onChange={(e) => setBringQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-14 rounded-lg border border-line bg-bg px-1.5 py-1 text-xs"
                  aria-label="Quantity"
                />
              )}
              <button
                type="button"
                onClick={() => void handleBring()}
                disabled={busy}
                className={`rounded-full px-3 py-1 text-xs font-medium ${accentBtn} disabled:opacity-50`}
              >
                I'll bring this
              </button>
            </div>
          )
        )}

        {!showAsk ? (
          <button
            type="button"
            onClick={() => setShowAsk(true)}
            className="rounded-full bg-bg px-3 py-1 text-xs font-medium"
          >
            Ask someone to bring it
          </button>
        ) : (
          <div className="mt-1 flex w-full flex-wrap items-center gap-1.5">
            <select
              value={askUserId}
              onChange={(e) => setAskUserId(e.target.value)}
              className="rounded-lg border border-line bg-bg px-2 py-1 text-xs"
            >
              <option value="">Who?</option>
              {askCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
            {needed == null && (
              <input
                type="number"
                min={1}
                value={askQty}
                onChange={(e) => setAskQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 rounded-lg border border-line bg-bg px-1.5 py-1 text-xs"
                aria-label="Quantity to ask for"
              />
            )}
            <button
              type="button"
              onClick={() => void handleAsk()}
              disabled={busy || !askUserId}
              className={`rounded-full px-3 py-1 text-xs font-medium ${accentBtn} disabled:opacity-50`}
            >
              Ask
            </button>
            <button
              type="button"
              onClick={() => setShowAsk(false)}
              className="rounded-full bg-bg px-3 py-1 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {item.creator && <p className={`mt-2 text-[10px] ${accentText} opacity-70`}>Added by {item.creator.display_name}</p>}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  )
}
