// Raw OSM raster tiles — no API key, no Maptiler/Mapbox/CARTO account
// needed. Dark mode is a pure CSS filter on the tile layer itself (see
// `.leaflet-dark` in index.css) rather than a second tile provider, so
// there's still only ever this one tile source to depend on.
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'
