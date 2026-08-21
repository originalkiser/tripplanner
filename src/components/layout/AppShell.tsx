import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { HeroScene } from '../HeroScene'

const TABS = [
  { to: '/', label: 'List', end: true, icon: ListIcon },
  { to: '/unplanned', label: 'Unplanned', end: false, icon: UnplannedIcon },
  { to: '/map', label: 'Map', end: false, icon: MapIcon },
  { to: '/album', label: 'Album', end: false, icon: AlbumIcon },
  { to: '/digest', label: 'Digest', end: false, icon: DigestIcon },
  { to: '/profile', label: 'Profile', end: false, icon: ProfileIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-bg text-text">
      <HeroScene />

      <main className="relative z-10 flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        className="relative z-10 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium ${
                isActive ? 'text-primary' : 'text-text-dim'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon active={isActive} />
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

interface IconProps {
  active: boolean
}

function iconProps(active: boolean) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

function ListIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth={3} />
    </svg>
  )
}

function UnplannedIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
      <path d="M12 13v4M10 15h4" />
    </svg>
  )
}

function MapIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

function AlbumIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-4-4 3-3-2-6 5" />
    </svg>
  )
}

function DigestIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 4h13l3 3v13H4z" />
      <path d="M8 9h9M8 13h9M8 17h5" />
    </svg>
  )
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  )
}
