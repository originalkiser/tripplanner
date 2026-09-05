import { useRef, useState } from 'react'
import { usePhotosStore, type Photo } from '../../stores/photosStore'
import { useAuthStore } from '../../stores/authStore'
import { tripPhotoUrl } from '../../lib/storage'

export function PhotoGallery({ activityId, photos }: { activityId: string | null; photos: Photo[] }) {
  const profile = useAuthStore((s) => s.profile)
  const { upload, remove } = usePhotosStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    setError(null)
    const { error } = await upload(file, profile.id, activityId)
    setUploading(false)
    if (error) setError(error)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo?')) return
    await remove(photo)
    setLightbox(null)
  }

  const canDelete = (photo: Photo) => profile && (profile.id === photo.user_id || profile.is_admin)

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightbox(p)}
            className="aspect-square overflow-hidden rounded-lg bg-secondary/10"
          >
            <img src={tripPhotoUrl(p.storage_path)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line text-2xl text-secondary/50">
          {uploading ? '…' : '+'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleFile(e)}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={tripPhotoUrl(lightbox.storage_path)}
            alt=""
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 flex items-center gap-4 text-sm text-white">
            <span>{lightbox.uploader?.display_name}</span>
            {canDelete(lightbox) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete(lightbox)
                }}
                className="underline"
              >
                Delete
              </button>
            )}
            <button type="button" onClick={() => setLightbox(null)} className="underline">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
