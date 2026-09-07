import { BeachScene } from './heroScenes/BeachScene'
import { MountainScene } from './heroScenes/MountainScene'
import { CityScene } from './heroScenes/CityScene'
import { AmusementParkScene } from './heroScenes/AmusementParkScene'
import type { Database } from '../types/database'

export type HeroTheme = Database['trip']['Tables']['trips']['Row']['hero_theme']

// Fixed to the top of the viewport so it never scrolls away (see
// .scene-fixed in index.css, shared by every theme). Which scene renders is
// the active trip's own hero_theme column — this component itself has no
// opinion beyond the switch below. Day/night within a theme is pure CSS
// (.scene-day / .scene-night, mirroring the data-theme / prefers-color-scheme
// rules that drive the rest of the palette), so it stays in sync with
// light/dark mode without any JS theme-tracking here either.
export function HeroScene({ theme }: { theme?: HeroTheme }) {
  switch (theme) {
    case 'mountain':
      return <MountainScene />
    case 'city':
      return <CityScene />
    case 'amusement_park':
      return <AmusementParkScene />
    case 'beach':
    default:
      return <BeachScene />
  }
}
