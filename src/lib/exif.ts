import { parse, gps } from 'exifr'

// The photo's actual capture time from its EXIF data, when present — falls
// back to null (caller uses upload time instead) for files with no EXIF at
// all (screenshots, images re-saved from messaging apps, etc.) or where
// parsing fails. Must run on the original file *before* compression —
// re-encoding through a canvas (see imageCompression.ts) strips all EXIF,
// so this can only ever work for photos not yet processed.
export async function getPhotoTakenAt(file: File): Promise<Date | null> {
  try {
    const tags = await parse(file, ['DateTimeOriginal', 'CreateDate'])
    const takenAt = tags?.DateTimeOriginal ?? tags?.CreateDate
    return takenAt instanceof Date && !isNaN(takenAt.getTime()) ? takenAt : null
  } catch {
    return null
  }
}

// Same caveat as above: only the original file (pre-compression) still has
// GPS EXIF at all.
export async function getPhotoLocation(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const coords = await gps(file)
    return coords ? { lat: coords.latitude, lng: coords.longitude } : null
  } catch {
    return null
  }
}
