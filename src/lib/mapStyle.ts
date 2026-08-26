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

// CARTO's free "Dark Matter" basemap — no API key, same no-account
// arrangement as the OSM raster tiles above.
export const darkRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    dark: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'dark', type: 'raster', source: 'dark' }],
}
