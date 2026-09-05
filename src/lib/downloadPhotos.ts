import JSZip from 'jszip'
import { tripPhotoUrl } from './storage'
import type { Photo } from '../stores/photosStore'

function extensionOf(storagePath: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(storagePath)
  return match ? match[1] : 'jpg'
}

// Photos live in Supabase Storage, a different origin than the app itself —
// an <a download> on a cross-origin href gets ignored by the browser (it
// just navigates instead of saving), so the only reliable way to force a
// save is to fetch the bytes ourselves and hand the browser a same-origin
// blob: URL.
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadPhoto(photo: Photo): Promise<void> {
  const res = await fetch(tripPhotoUrl(photo.storage_path))
  const blob = await res.blob()
  saveBlob(blob, `photo.${extensionOf(photo.storage_path)}`)
}

export async function downloadPhotosAsZip(
  photos: Photo[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip()
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const res = await fetch(tripPhotoUrl(photo.storage_path))
    const blob = await res.blob()
    zip.file(`photo-${i + 1}.${extensionOf(photo.storage_path)}`, blob)
    onProgress?.(i + 1, photos.length)
  }
  const content = await zip.generateAsync({ type: 'blob' })
  saveBlob(content, `trip-photos-${new Date().toISOString().slice(0, 10)}.zip`)
}
