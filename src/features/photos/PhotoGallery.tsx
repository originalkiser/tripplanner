import { useRef, useState } from 'react'
import { usePhotosStore, type Photo } from '../../stores/photosStore'
import { useAuthStore } from '../../stores/authStore'
import { tripPhotoUrl } from '../../lib/storage'

const SWIPE_THRESHOLD_PX = 50

export function PhotoGallery({ activityId, photos }: { activityId: string | null; photos: Photo[] }) {
  const profile = useAuthStore((s) => s.profile)
  const { upload, remove } = usePhotosStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)

  const lightbox = lightboxIndex != null ? photos[lightboxIndex] : null

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !profile) return
    setUploading(true)
    setError(null)
    for (const file of files) {
      const { error } = await upload(file, profile.id, activityId)
      if (error) setError(error)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo?')) return
    await remove(photo)
    setLightboxIndex(null)
  }

  function showPrev() {
    setLightboxIndex((i) => {
      if (i == null || i === 0) return i
      setSlideDir('left')
      return i - 1
    })
  }

  function showNext() {
    setLightboxIndex((i) => {
      if (i == null || i === photos.length - 1) return i
      setSlideDir('right')
      return i + 1
    })
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX > SWIPE_THRESHOLD_PX) showPrev()
    else if (deltaX < -SWIPE_THRESHOLD_PX) showNext()
  }

  const canDelete = (photo: Photo) => profile && (profile.id === photo.user_id || profile.is_admin)

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSlideDir(null)
              setLightboxIndex(i)
            }}
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
            multiple
            onChange={(e) => void handleFile(e)}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {lightbox && lightboxIndex != null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                showPrev()
              }}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl text-white"
            >
              &#8249;
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                showNext()
              }}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl text-white"
            >
              &#8250;
            </button>
          )}
          <img
            key={lightbox.id}
            src={tripPhotoUrl(lightbox.storage_path)}
            alt=""
            className={`max-h-[80vh] max-w-full rounded-lg object-contain ${
              slideDir === 'right' ? 'photo-slide-in-right' : slideDir === 'left' ? 'photo-slide-in-left' : ''
            }`}
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
            <button type="button" onClick={() => setLightboxIndex(null)} className="underline">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
