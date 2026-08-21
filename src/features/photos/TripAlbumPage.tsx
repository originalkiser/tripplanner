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
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Trip Album</h1>
      <p className="mt-1 text-sm text-text-dim">Every photo from the trip, in time order.</p>

      <label className="card-shadow mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-sm font-medium text-primary">
        {uploading ? 'Uploading…' : '+ Add a photo'}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleUpload(e)}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {loading && <p className="mt-4 text-sm text-text-dim">Loading…</p>}
      {!loading && all.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">No photos yet — add the first one.</p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {all.map((photo) => {
          const canManage = profile && (profile.id === photo.user_id || profile.is_admin)
          return (
            <div key={photo.id} className="card-shadow overflow-hidden rounded-xl border border-line bg-surface">
              <img src={tripPhotoUrl(photo.storage_path)} alt="" className="max-h-96 w-full object-cover" />
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
    </div>
  )
}
