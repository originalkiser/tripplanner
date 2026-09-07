const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8

async function compressTo(source: Blob, maxDimension: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? source), 'image/jpeg', quality)
  })
}

export async function compressImage(file: File): Promise<Blob> {
  return compressTo(file, MAX_DIMENSION, JPEG_QUALITY)
}

const ARCHIVE_MAX_DIMENSION = 640
const ARCHIVE_JPEG_QUALITY = 0.5

// Deliberately much smaller than upload-time compression — used only when
// archiving, after the full-quality original has already been exported
// elsewhere. This is lossy and one-way: there's no recovering the original
// once it's overwritten with this.
export async function compressForArchive(blob: Blob): Promise<Blob> {
  return compressTo(blob, ARCHIVE_MAX_DIMENSION, ARCHIVE_JPEG_QUALITY)
}
