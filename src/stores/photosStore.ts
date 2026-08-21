import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompression'

export interface Photo {
  id: string
  activity_id: string | null
  user_id: string
  storage_path: string
  caption: string | null
  created_at: string
  uploader: { display_name: string } | null
}

const SELECT = `id, activity_id, user_id, storage_path, caption, created_at, uploader:user_profiles!user_id(display_name)`

interface PhotosState {
  byActivity: Record<string, Photo[]>
  album: Photo[]
  loading: boolean
  fetchForActivity: (activityId: string) => Promise<void>
  fetchAlbum: () => Promise<void>
  upload: (file: File, userId: string, activityId: string | null) => Promise<{ error: string | null }>
  remove: (photo: Photo) => Promise<{ error: string | null }>
}

export const usePhotosStore = create<PhotosState>((set, get) => ({
  byActivity: {},
  album: [],
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

  upload: async (file, userId, activityId) => {
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

    return { error: null }
  },

  remove: async (photo) => {
    await supabase.storage.from('trip-photos').remove([photo.storage_path])
    const { error } = await supabase.from('activity_photos').delete().eq('id', photo.id)
    if (error) return { error: error.message }

    if (photo.activity_id) await get().fetchForActivity(photo.activity_id)
    else await get().fetchAlbum()

    return { error: null }
  },
}))
