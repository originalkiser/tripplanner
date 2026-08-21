import { useEffect, useRef } from 'react'
import { Map as MaplibreMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { osmRasterStyle } from '../lib/mapStyle'

interface MiniMapProps {
  lat: number
  lng: number
  className?: string
}

export function MiniMap({ lat, lng, className }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MaplibreMap({
      container: containerRef.current,
      style: osmRasterStyle,
      center: [lng, lat],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    })
    mapRef.current = map
    markerRef.current = new Marker({ color: '#1B7A8C' }).setLngLat([lng, lat]).addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mapRef.current?.setCenter([lng, lat])
    markerRef.current?.setLngLat([lng, lat])
  }, [lat, lng])

  return <div ref={containerRef} className={className ?? 'h-40 w-full rounded-lg'} />
}
