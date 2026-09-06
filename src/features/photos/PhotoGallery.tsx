import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePhotosStore, hasLiked, type Photo } from '../../stores/photosStore'
import { useAuthStore } from '../../stores/authStore'
import { tripPhotoUrl } from '../../lib/storage'
import { downloadPhoto } from '../../lib/downloadPhotos'
import { HeartIcon } from './HeartIcon'

const SWIPE_THRESHOLD_PX = 50
const HEART_BURST_MS = 700

export function PhotoGallery({ activityId, photos }: { activityId: string | null; photos: Photo[] }) {
  const profile = useAuthStore((s) => s.profile)
  const { upload, remove, toggleLike } = usePhotosStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [burstId, setBurstId] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)
  const isPinching = useRef(false)

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

  // A pinch-to-zoom gesture is two touch points — without this, its second
  // finger lifting off got read as a one-finger swipe (using whichever
  // finger happened to be in `changedTouches`), flipping to the next/prev
  // photo right as someone zoomed in on the current one.
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length > 1) {
      isPinching.current = true
      touchStartX.current = null
      return
    }
    isPinching.current = false
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length > 1) {
      isPinching.current = true
      touchStartX.current = null
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (isPinching.current) {
      isPinching.current = false
      return
    }
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX > SWIPE_THRESHOLD_PX) showPrev()
    else if (deltaX < -SWIPE_THRESHOLD_PX) showNext()
  }

  async function handleDownload(photo: Photo) {
    setDownloading(true)
    try {
      await downloadPhoto(photo)
    } finally {
      setDownloading(false)
    }
  }

  function handleLikeToggle(photo: Photo) {
    if (!profile) return
    void toggleLike(photo, profile.id, hasLiked(photo, profile.id))
  }

  // Double-tap always likes (never unlikes) and always plays the heart
  // burst, even if already liked — matches the familiar Instagram gesture.
  function triggerLikeBurst(photo: Photo) {
    setBurstId(photo.id)
    setTimeout(() => setBurstId((id) => (id === photo.id ? null : id)), HEART_BURST_MS)
    if (profile && !hasLiked(photo, profile.id)) {
      void toggleLike(photo, profile.id, false)
    }
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

      {lightbox &&
        lightboxIndex != null &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2"
            onClick={() => setLightboxIndex(null)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white"
            >
              &times;
            </button>
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
              className={`max-h-[96dvh] max-w-full touch-manipulation object-contain ${
                slideDir === 'right' ? 'photo-slide-in-right' : slideDir === 'left' ? 'photo-slide-in-left' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation()
                triggerLikeBurst(lightbox)
              }}
            />
            {burstId === lightbox.id && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <HeartIcon filled className="heart-burst h-28 w-28 drop-shadow-lg" />
              </span>
            )}
            <div
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-sm text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{lightbox.uploader?.display_name}</span>
              <button
                type="button"
                onClick={() => handleLikeToggle(lightbox)}
                className="flex items-center gap-1"
              >
                <HeartIcon filled={!!profile && hasLiked(lightbox, profile.id)} className="h-5 w-5" />
                {lightbox.likes.length > 0 && <span className="font-data text-xs">{lightbox.likes.length}</span>}
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={() => void handleDownload(lightbox)}
                className="underline disabled:opacity-50"
              >
                {downloading ? 'Downloading…' : 'Download'}
              </button>
              {canDelete(lightbox) && (
                <button type="button" onClick={() => void handleDelete(lightbox)} className="underline">
                  Delete
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
