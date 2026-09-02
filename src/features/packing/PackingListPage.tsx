import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { usePackingStore } from '../../stores/packingStore'
import { supabase } from '../../lib/supabase'
import { resolveAssetUrl } from '../../lib/assetUrl'
import { PackingItemCard } from './PackingItemCard'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

const FALLBACK_AVATAR = resolveAssetUrl('/avatars/starfish.svg')!

export function PackingListPage() {
  const profile = useAuthStore((s) => s.profile)
  const { lists, items, members, fetchLists, fetchItems, fetchMembers, createItem, restoreItem, createPrivateList, addMembers, removeMember } =
    usePackingStore()

  const [mode, setMode] = useState<'trip' | 'private'>('trip')
  const [activePrivateId, setActivePrivateId] = useState<string | null>(null)
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [showDeleted, setShowDeleted] = useState(false)

  const [name, setName] = useState('')
  const [isMulti, setIsMulti] = useState(false)
  const [unlimited, setUnlimited] = useState(false)
  const [quantity, setQuantity] = useState(2)
  const [saving, setSaving] = useState(false)

  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteIds, setInviteIds] = useState<Set<string>>(new Set())
  const [confirmInvite, setConfirmInvite] = useState<Member[] | null>(null)

  useEffect(() => {
    void fetchLists()
    void supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
      .then(({ data }) => setAllMembers(data ?? []))
  }, [fetchLists])

  const tripList = lists.find((l) => l.kind === 'trip')
  const privateLists = lists.filter((l) => l.kind === 'private')

  useEffect(() => {
    if (tripList) void fetchItems(tripList.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripList?.id])

  useEffect(() => {
    if (!activePrivateId && privateLists.length > 0) setActivePrivateId(privateLists[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateLists.length])

  useEffect(() => {
    if (mode === 'private' && activePrivateId) {
      void fetchItems(activePrivateId)
      void fetchMembers(activePrivateId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activePrivateId])

  const activeList = mode === 'trip' ? tripList : privateLists.find((l) => l.id === activePrivateId)
  const activeItems = activeList ? (items[activeList.id] ?? []) : []
  const activeMembers = activeList ? (members[activeList.id] ?? []) : []
  const liveItems = activeItems.filter((i) => !i.deleted_at)
  const deletedItems = activeItems.filter((i) => i.deleted_at)

  const accent = mode === 'private' ? 'coral' : 'primary'

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !activeList || !name.trim()) return
    setSaving(true)
    const quantityNeeded = !isMulti ? 1 : unlimited ? null : quantity
    await createItem(activeList.id, name.trim(), quantityNeeded, profile.id)
    setSaving(false)
    setName('')
    setIsMulti(false)
    setUnlimited(false)
    setQuantity(2)
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !newListName.trim()) return
    setSaving(true)
    const { listId } = await createPrivateList(newListName.trim(), profile.id)
    setSaving(false)
    setNewListName('')
    setShowNewList(false)
    if (listId) setActivePrivateId(listId)
  }

  function toggleInvite(userId: string) {
    setInviteIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function openConfirmInvite() {
    const picked = allMembers.filter((m) => inviteIds.has(m.id))
    if (picked.length === 0) return
    setConfirmInvite(picked)
  }

  async function handleConfirmInvite() {
    if (!profile || !activeList || !confirmInvite) return
    setSaving(true)
    await addMembers(activeList.id, confirmInvite.map((m) => m.id), profile.id)
    setSaving(false)
    setConfirmInvite(null)
    setInviteIds(new Set())
    setShowInvite(false)
  }

  const inviteCandidates = allMembers.filter((m) => !activeMembers.some((am) => am.user_id === m.id))

  return (
    <div className={`mx-auto max-w-6xl pb-24 ${mode === 'private' ? 'bg-coral/5' : ''}`}>
      <div className="sticky top-0 z-20 bg-bg px-4 pb-3 pt-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h1 className={`text-2xl font-semibold ${mode === 'private' ? 'text-coral' : 'text-primary'}`}>
            Packing List
          </h1>
        </div>
        <div className="mt-3 flex rounded-full bg-surface-2 p-0.5 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode('trip')}
            className={`flex-1 rounded-full px-3 py-1.5 ${mode === 'trip' ? 'bg-primary text-white' : 'text-text-dim'}`}
          >
            Trip
          </button>
          <button
            type="button"
            onClick={() => setMode('private')}
            className={`flex-1 rounded-full px-3 py-1.5 ${mode === 'private' ? 'bg-coral text-white' : 'text-text-dim'}`}
          >
            Private
          </button>
        </div>
      </div>

      <div className="p-4">
        {mode === 'private' && (
          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {privateLists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActivePrivateId(l.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    l.id === activePrivateId ? 'bg-coral text-white' : 'bg-surface text-coral'
                  }`}
                >
                  {l.name}
                </button>
              ))}
              {!showNewList ? (
                <button
                  type="button"
                  onClick={() => setShowNewList(true)}
                  className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-coral"
                >
                  + New list
                </button>
              ) : (
                <form onSubmit={handleCreateList} className="flex gap-1.5">
                  <input
                    autoFocus
                    required
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-coral px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Create
                  </button>
                </form>
              )}
            </div>

            {!activeList && privateLists.length === 0 && !showNewList && (
              <p className="mt-4 text-sm text-text-dim">
                Private lists are only visible to whoever's invited. Create one to plan gear for
                just your room, car, or crew.
              </p>
            )}
          </div>
        )}

        {activeList && mode === 'private' && (
          <div className="mb-4 rounded-xl border border-coral/20 bg-surface p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-coral">Members</p>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => (
                <span
                  key={m.user_id}
                  className="flex items-center gap-1.5 rounded-full bg-coral/10 py-1 pl-1 pr-2 text-xs"
                >
                  <img
                    src={resolveAssetUrl(m.profile?.avatar_url) ?? FALLBACK_AVATAR}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  {m.profile?.display_name}
                  {m.user_id !== profile?.id && (
                    <button
                      type="button"
                      onClick={() => void removeMember(activeList.id, m.user_id)}
                      className="ml-0.5 text-coral opacity-60 hover:opacity-100"
                      aria-label={`Remove ${m.profile?.display_name}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>

            {!showInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="mt-2 rounded-full bg-bg px-3 py-1 text-xs font-medium text-coral"
              >
                + Invite people
              </button>
            ) : (
              <div className="mt-2 rounded-lg bg-bg p-2">
                {inviteCandidates.length === 0 ? (
                  <p className="text-xs text-text-dim">Everyone's already on this list.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {inviteCandidates.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={inviteIds.has(m.id)} onChange={() => toggleInvite(m.id)} />
                        {m.display_name}
                      </label>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  {inviteCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={openConfirmInvite}
                      disabled={inviteIds.size === 0}
                      className="rounded-full bg-coral px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Invite
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvite(false)
                      setInviteIds(new Set())
                    }}
                    className="rounded-full bg-surface px-3 py-1 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeList && (
          <>
            <form
              onSubmit={handleCreateItem}
              className={`mb-4 flex flex-col gap-2 rounded-xl border p-3 ${
                mode === 'private' ? 'border-coral/20 bg-surface' : 'border-line bg-surface'
              }`}
            >
              <div className="flex gap-2">
                <input
                  required
                  placeholder="Add an item…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                    mode === 'private' ? 'bg-coral' : 'bg-primary'
                  }`}
                >
                  Add
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-dim">
                <input type="checkbox" checked={isMulti} onChange={(e) => setIsMulti(e.target.checked)} />
                This needs more than one (e.g. board games)
              </label>
              {isMulti && (
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={unlimited}
                      onChange={(e) => setUnlimited(e.target.checked)}
                    />
                    Unlimited
                  </label>
                  {!unlimited && (
                    <label className="flex items-center gap-1.5">
                      How many needed:
                      <input
                        type="number"
                        min={2}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(2, parseInt(e.target.value, 10) || 2))}
                        className="w-16 rounded-lg border border-line bg-bg px-1.5 py-1"
                      />
                    </label>
                  )}
                </div>
              )}
            </form>

            {liveItems.length === 0 && (
              <p className="mt-4 text-center text-sm text-text-dim">Nothing on this list yet.</p>
            )}

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {liveItems.map((item) => (
                <PackingItemCard
                  key={item.id}
                  item={item}
                  listId={activeList.id}
                  userId={profile!.id}
                  members={allMembers}
                  accent={accent}
                />
              ))}
            </div>

            {deletedItems.length > 0 && (
              <div className="mt-6 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeleted((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm font-medium text-text-dim"
                >
                  Deleted ({deletedItems.length})
                  <span>{showDeleted ? '−' : '+'}</span>
                </button>
                {showDeleted && (
                  <ul className="mt-2 flex flex-col gap-2">
                    {deletedItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                      >
                        <span className="text-text-dim line-through">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => void restoreItem(item.id, activeList.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium text-white ${
                            mode === 'private' ? 'bg-coral' : 'bg-primary'
                          }`}
                        >
                          Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {confirmInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmInvite(null)}
        >
          <div className="card-shadow w-full max-w-xs rounded-2xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-heading text-lg font-semibold">Add to this list?</h3>
            <p className="mb-4 text-sm text-text-dim">
              {confirmInvite.map((m) => m.display_name).join(', ')} will be able to see and edit this
              private list.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleConfirmInvite()}
                className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Yes, add them
              </button>
              <button
                type="button"
                onClick={() => setConfirmInvite(null)}
                className="rounded-lg bg-bg px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
