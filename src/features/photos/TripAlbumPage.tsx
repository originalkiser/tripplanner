import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePhotosStore } from '../../stores/photosStore'
import { PhotoGallery } from './PhotoGallery'

export function TripAlbumPage() {
  const { album, loading, fetchAlbum } = usePhotosStore()

  useEffect(() => {
    void fetchAlbum()
  }, [fetchAlbum])

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <Link to="/profile" className="text-sm text-primary underline">
        &larr; Profile
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold text-primary">Trip Album</h1>
      {loading && <p className="text-sm opacity-60">Loading…</p>}
      <PhotoGallery activityId={null} photos={album} />
    </div>
  )
}
