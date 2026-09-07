import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompression'
import { getPhotoTakenAt, getPhotoLocation } from '../lib/exif'
import { reverseGeocode } from '../lib/geo'

export interface PhotoTag {
  user_id: string
  tagged_by: string
  created_at: string
  profile: { display_name: string } | null
}

export interface PhotoLike {
  user_id: string
}

export interface Photo {
  id: string
  activity_id: string | null
  user_id: string
  storage_path: string
  caption: string | null
  created_at: string
  taken_at: string
  location_name: string | null
  location_lat: number | null
  location_lng: number | null
  uploader: { display_name: string } | null
  activity: { id: string; name: string } | null
  tags: PhotoTag[]
  likes: PhotoLike[]
}

export function hasLiked(photo: Photo, userId: string): boolean {
  return photo.likes.some((l) => l.user_id === userId)
}

function extensionOf(filename: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename)
  return match ? match[1].toLowerCase() : fallback
}

// Photos uploaded by someone other than the given user since the given
// timestamp — powers the Home "new photos" notification.
export function newPhotosSince(all: Photo[], userId: string, sinceIso: string): Photo[] {
  const since = new Date(sinceIso).getTime()
  return all.filter((p) => p.user_id !== userId && new Date(p.created_at).getTime() > since)
}

// Tags landed on the given user (by someone else) since the given timestamp
// — powers the separate "you were tagged" notification. Carries the photo's
// id (not part of PhotoTag itself) so that notification can link straight
// to the photo instead of just the album in general.
export function newTagsSince(
  all: Photo[],
  userId: string,
  sinceIso: string,
): (PhotoTag & { photoId: string })[] {
  const since = new Date(sinceIso).getTime()
  const tags: (PhotoTag & { photoId: string })[] = []
  for (const photo of all) {
    for (const tag of photo.tags) {
      if (tag.user_id === userId && tag.tagged_by !== userId && new Date(tag.created_at).getTime() > since) {
        tags.push({ ...tag, photoId: photo.id })
      }
    }
  }
  return tags
}

const SELECT = `
  id, activity_id, user_id, storage_path, caption, created_at, taken_at,
  location_name, location_lat, location_lng,
  uploader:user_profiles!user_id(display_name),
  activity:activities(id, name),
  tags:photo_tags(user_id, tagged_by, created_at, profile:user_profiles!user_id(display_name)),
  likes:photo_likes(user_id)
`

interface PhotosState {
  byActivity: Record<string, Photo[]>
  album: Photo[]
  all: Photo[]
  loading: boolean
  fetchForActivity: (activityId: string) => Promise<void>
  fetchAlbum: () => Promise<void>
  fetchAll: () => Promise<void>
  upload: (file: File, userId: string, activityId: string | null) => Promise<{ error: string | null }>
  remove: (photo: Photo) => Promise<{ error: string | null }>
  linkToActivity: (photoId: string, activityId: string | null) => Promise<{ error: string | null }>
  addTag: (photoId: string, userId: string, taggedBy: string) => Promise<{ error: string | null }>
  removeTag: (photoId: string, userId: string) => Promise<{ error: string | null }>
  toggleLike: (photo: Photo, userId: string, isLiked: boolean) => Promise<{ error: string | null }>
  setPhotoLocation: (
    photo: Photo,
    location: { name: string | null; lat: number | null; lng: number | null },
  ) => Promise<{ error: string | null }>
}

export const usePhotosStore = create<PhotosState>((set, get) => ({
  byActivity: {},
  album: [],
  all: [],
  loading: false,

  fetchForActivity: async (activityId) => {
    const { data, error } = await supabase
      .from('activity_photos')
      .select(SELECT)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      return
    }
    set((state) => ({
      byActivity: { ...state.byActivity, [activityId]: (data ?? []) as unknown as Photo[] },
    }))
  },

  fetchAlbum: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('activity_photos')
      .select(SELECT)
      .is('activity_id', null)
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      set({ loading: false })
      return
    }
    set({ album: (data ?? []) as unknown as Photo[], loading: false })
  },

  fetchAll: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('activity_photos')
      .select(SELECT)
      .order('created_at', { ascending: true })
    if (error) {
      console.error(error)
      set({ loading: false })
      return
    }
    set({ all: (data ?? []) as unknown as Photo[], loading: false })
  },

  upload: async (file, userId, activityId) => {
    try {
      const isVideo = file.type.startsWith('video/')

      // EXIF (capture time, GPS) only exists on the original image file —
      // compression re-encodes it through a canvas, which strips all
      // metadata — and doesn't apply to video at all.
      const [takenAt, location] = isVideo
        ? [null, null]
        : await Promise.all([getPhotoTakenAt(file), getPhotoLocation(file)])
      const locationName = location ? await reverseGeocode(location.lat, location.lng) : null

      // Video is uploaded as-is (no client-side transcoding); only images go
      // through the compress-to-JPEG pipeline.
      const toUpload = isVideo ? file : await compressImage(file)
      const ext = isVideo ? extensionOf(file.name, 'mp4') : 'jpg'
      const contentType = isVideo ? file.type || 'video/mp4' : 'image/jpeg'
      const folder = activityId ?? 'album'
      const path = `${folder}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('trip-photos')
        .upload(path, toUpload, { contentType })
      if (uploadError) return { error: uploadError.message }

      const { error: insertError } = await supabase.from('activity_photos').insert({
        activity_id: activityId,
        user_id: userId,
        storage_path: path,
        // No EXIF? Fall back to upload time, same as every photo did before
        // this existed.
        taken_at: (takenAt ?? new Date()).toISOString(),
        location_name: locationName,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
      })
      if (insertError) return { error: insertError.message }

      if (activityId) await get().fetchForActivity(activityId)
      else await get().fetchAlbum()
      await get().fetchAll()

      return { error: null }
    } catch (err) {
      // A bad/unsupported file (e.g. a format createImageBitmap can't
      // decode) throws instead of rejecting cleanly — without this, one bad
      // file in a multi-select batch would abort the whole upload loop with
      // no error and leave the caller's "uploading" state stuck forever.
      return { error: err instanceof Error ? err.message : 'Upload failed' }
    }
  },

  remove: async (photo) => {
    await supabase.storage.from('trip-photos').remove([photo.storage_path])
    const { error } = await supabase.from('activity_photos').delete().eq('id', photo.id)
    if (error) return { error: error.message }

    if (photo.activity_id) await get().fetchForActivity(photo.activity_id)
    else await get().fetchAlbum()
    await get().fetchAll()

    return { error: null }
  },

  linkToActivity: async (photoId, activityId) => {
    const { error } = await supabase
      .from('activity_photos')
      .update({ activity_id: activityId })
      .eq('id', photoId)
    if (error) return { error: error.message }
    await get().fetchAll()
    return { error: null }
  },

  addTag: async (photoId, userId, taggedBy) => {
    const { error } = await supabase
      .from('photo_tags')
      .insert({ photo_id: photoId, user_id: userId, tagged_by: taggedBy })
    if (error) return { error: error.message }
    await get().fetchAll()
    return { error: null }
  },

  removeTag: async (photoId, userId) => {
    const { error } = await supabase
      .from('photo_tags')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    await get().fetchAll()
    return { error: null }
  },

  toggleLike: async (photo, userId, isLiked) => {
    const { error } = isLiked
      ? await supabase.from('photo_likes').delete().eq('photo_id', photo.id).eq('user_id', userId)
      : await supabase.from('photo_likes').insert({ photo_id: photo.id, user_id: userId })
    if (error) return { error: error.message }

    if (photo.activity_id) await get().fetchForActivity(photo.activity_id)
    else await get().fetchAlbum()
    await get().fetchAll()

    return { error: null }
  },

  setPhotoLocation: async (photo, location) => {
    const { error } = await supabase
      .from('activity_photos')
      .update({
        location_name: location.name,
        location_lat: location.lat,
        location_lng: location.lng,
      })
      .eq('id', photo.id)
    if (error) return { error: error.message }

    if (photo.activity_id) await get().fetchForActivity(photo.activity_id)
    else await get().fetchAlbum()
    await get().fetchAll()

    return { error: null }
  },
}))
