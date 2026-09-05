import { useEffect, useRef, useState } from 'react'
import { usePhotosStore, type Photo } from '../../stores/photosStore'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tripPhotoUrl } from '../../lib/storage'
import type { Database } from '../../types/database'

type Member = Database['trip']['Tables']['user_profiles']['Row']

function formatTaken(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TripAlbumPage() {
  const profile = useAuthStore((s) => s.profile)
  const { all, loading, fetchAll, upload, remove, linkToActivity, addTag, removeTag } = usePhotosStore()
  const activities = useActivitiesStore((s) => s.activities)
  const fetchActivities = useActivitiesStore((s) => s.fetchActivities)

  const [members, setMembers] = useState<Member[]>([])
  const [uploading, setUploading] = useState(false)
  const [taggingPhotoId, setTaggingPhotoId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchAll()
    void fetchActivities()
    void supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
      .then(({ data }) => setMembers(data ?? []))
  }, [fetchAll, fetchActivities])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    await upload(file, profile.id, null)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo for everyone?')) return
    await remove(photo)
    setLightbox(null)
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-32">
      <h1 className="text-2xl font-semibold text-primary">Trip Album</h1>
      <p className="mt-1 text-sm text-text-dim">Every photo from the trip, in time order.</p>

      {all.length > 0 && (
        <div className="mt-4 -mx-4 flex gap-0 overflow-x-auto px-6 py-3">
          {all.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(photo)}
              className="card-shadow relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-surface bg-surface"
              style={{ marginLeft: i === 0 ? 0 : -28, zIndex: i, transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 4}deg)` }}
            >
              <img src={tripPhotoUrl(photo.storage_path)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-4 text-sm text-text-dim">Loading…</p>}
      {!loading && all.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">No photos yet — add the first one below.</p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {all.map((photo) => {
          const canManage = profile && (profile.id === photo.user_id || profile.is_admin)
          return (
            <div key={photo.id} className="card-shadow overflow-hidden rounded-xl border border-line bg-surface">
              <button type="button" onClick={() => setLightbox(photo)} className="block w-full">
                <img src={tripPhotoUrl(photo.storage_path)} alt="" className="max-h-96 w-full object-cover" />
              </button>
              <div className="flex flex-col gap-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{photo.uploader?.display_name ?? 'Someone'}</span>
                  <span className="font-data text-xs text-text-dim">{formatTaken(photo.created_at)}</span>
                </div>

                <select
                  value={photo.activity_id ?? ''}
                  disabled={!canManage}
                  onChange={(e) => void linkToActivity(photo.id, e.target.value || null)}
                  className="rounded-lg border border-line bg-bg px-2 py-1 text-xs disabled:opacity-60"
                >
                  <option value="">No activity/location tagged</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-1">
                  {photo.tags.map((tag) => (
                    <span
                      key={tag.user_id}
                      className="flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] text-secondary"
                    >
                      {tag.profile?.display_name}
                      {(profile?.id === tag.user_id || profile?.id === photo.user_id || profile?.is_admin) && (
                        <button
                          type="button"
                          onClick={() => void removeTag(photo.id, tag.user_id)}
                          className="opacity-60"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTaggingPhotoId((v) => (v === photo.id ? null : photo.id))}
                    className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-text-dim"
                  >
                    + Tag someone
                  </button>
                </div>

                {taggingPhotoId === photo.id && (
                  <div className="flex flex-wrap gap-1 rounded-lg bg-bg p-2">
                    {members
                      .filter((m) => !photo.tags.some((t) => t.user_id === m.id))
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            void addTag(photo.id, m.id, profile!.id)
                            setTaggingPhotoId(null)
                          }}
                          className="rounded-full bg-surface px-2 py-1 text-xs shadow-sm"
                        >
                          {m.display_name}
                        </button>
                      ))}
                  </div>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(photo)}
                    className="self-start text-xs text-text-dim underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md px-4">
        <label className="card-shadow flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface py-3 text-sm font-medium text-primary">
          {uploading ? 'Uploading…' : '+ Add a photo'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleUpload(e)}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white"
          >
            &times;
          </button>
          <img
            src={tripPhotoUrl(lightbox.storage_path)}
            alt=""
            className="max-h-[75vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-sm text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{lightbox.uploader?.display_name}</span>
            {profile && (profile.id === lightbox.user_id || profile.is_admin) && (
              <button type="button" onClick={() => void handleDelete(lightbox)} className="underline">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
