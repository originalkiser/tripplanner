export interface PresetAvatar {
  id: string
  label: string
  path: string
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'starfish', label: 'Starfish', path: '/avatars/starfish.svg' },
  { id: 'sailboat', label: 'Sailboat', path: '/avatars/sailboat.svg' },
  { id: 'palm-tree', label: 'Palm Tree', path: '/avatars/palm-tree.svg' },
  { id: 'sun', label: 'Sun', path: '/avatars/sun.svg' },
  { id: 'wave', label: 'Wave', path: '/avatars/wave.svg' },
  { id: 'seashell', label: 'Seashell', path: '/avatars/seashell.svg' },
  { id: 'flip-flop', label: 'Flip-Flop', path: '/avatars/flip-flop.svg' },
  { id: 'crab', label: 'Crab', path: '/avatars/crab.svg' },
]
