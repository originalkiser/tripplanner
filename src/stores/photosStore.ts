import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompression'

export interface PhotoTag {
  user_id: string
  profile: { display_name: string } | null
}

export interface Photo {
  id: string
  activity_id: string | null
  user_id: string
  storage_path: string
  caption: string | null
  created_at: string
  uploader: { display_name: string } | null
  activity: { id: string; name: string } | null
  tags: PhotoTag[]
}

// Photos uploaded by someone other than the given user since the given
// timestamp — powers the Home "new photos" notification.
export function newPhotosSince(all: Photo[], userId: string, sinceIso: string): Photo[] {
  const since = new Date(sinceIso).getTime()
  return all.filter((p) => p.user_id !== userId && new Date(p.created_at).getTime() > since)
}

const SELECT = `
  id, activity_id, user_id, storage_path, caption, created_at,
  uploader:user_profiles!user_id(display_name),
  activity:activities(id, name),
  tags:photo_tags(user_id, profile:user_profiles!user_id(display_name))
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
      const compressed = await compressImage(file)
      const ext = 'jpg'
      const folder = activityId ?? 'album'
      const path = `${folder}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('trip-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (uploadError) return { error: uploadError.message }

      const { error: insertError } = await supabase.from('activity_photos').insert({
        activity_id: activityId,
        user_id: userId,
        storage_path: path,
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
}))
