import type { StyleSpecification } from 'maplibre-gl'

// Raw OSM raster tiles — no API key, no Maptiler/Mapbox account needed.
// Fine for a 7-person trip app's traffic volume under OSM's tile usage policy.
export const osmRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}
