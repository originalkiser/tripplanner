import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HeroScene } from '../HeroScene'
import { UpdateBanner } from '../UpdateBanner'
import { PollStack } from '../../features/polls/PollStack'
import { usePendingPollCount } from '../../features/polls/usePendingPollCount'
import { usePendingInviteCount } from '../../features/activities/usePendingInviteCount'
import { useActivitiesStore } from '../../stores/activitiesStore'

// Pulls in MapLibre (for the location-confirm preview) — keep it out of the
// initial bundle since most screens won't open the modal.
const CreateActivityModal = lazy(() =>
  import('../../features/activities/CreateActivityModal').then((m) => ({ default: m.CreateActivityModal })),
)

// The album page has its own dedicated "add a photo" pinned bar — a second,
// generic "add activity" button there would just collide with it.
const HIDE_GLOBAL_ADD = ['/album']

const LEFT_TABS = [
  { to: '/planned', label: 'Planned', end: true, icon: PlannedIcon },
  { to: '/unplanned', label: 'Unplanned', end: false, icon: UnplannedIcon },
  { to: '/map', label: 'Map', end: false, icon: MapIcon },
]

const RIGHT_TABS = [
  { to: '/album', label: 'Album', end: false, icon: AlbumIcon },
  { to: '/digest', label: 'Digest', end: false, icon: DigestIcon },
  { to: '/profile', label: 'Profile', end: false, icon: ProfileIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [showCreate, setShowCreate] = useState(false)
  const showGlobalAdd = !HIDE_GLOBAL_ADD.includes(location.pathname)
  const pendingPollCount = usePendingPollCount()
  const pendingInviteCount = usePendingInviteCount()
  const pendingCount = pendingPollCount + pendingInviteCount
  const fetchActivities = useActivitiesStore((s) => s.fetchActivities)

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-bg text-text">
      <HeroScene />
      <UpdateBanner />
      <PollStack />

      <main className="relative z-10 flex-1 overflow-y-auto pt-[var(--scene-h)]">
        {children}
      </main>

      {showGlobalAdd && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          aria-label="Add activity"
          className="card-shadow fixed bottom-16 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {showCreate && (
        <Suspense fallback={null}>
          <CreateActivityModal onClose={() => setShowCreate(false)} />
        </Suspense>
      )}

      <nav
        className="relative z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {LEFT_TABS.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
        <div className="w-16 shrink-0" aria-hidden />
        {RIGHT_TABS.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}

        <NavLink
          to="/"
          end
          className="absolute left-1/2 -top-2.5 flex -translate-x-1/2 flex-col items-center gap-0.5"
        >
          {({ isActive }) => (
            <>
              <div
                className={`card-shadow relative flex h-10 w-10 items-center justify-center rounded-full text-white ${
                  isActive ? 'bg-coral' : 'bg-accent'
                }`}
              >
                <HomeIcon active={isActive} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-coral' : 'text-text-dim'}`}>
                Home
              </span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  )
}

interface Tab {
  to: string
  label: string
  end: boolean
  icon: (props: IconProps) => React.JSX.Element
}

function TabLink({ to, label, end, icon: Icon }: Tab) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium ${
          isActive ? 'text-primary' : 'text-text-dim'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon active={isActive} />
          {label}
        </>
      )}
    </NavLink>
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

function PlannedIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="M8.5 13.5 11 16l4.5-5" />
    </svg>
  )
}

function UnplannedIcon({ active }: IconProps) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <text x="12" y="18" textAnchor="middle" fontSize="8" fontWeight="700" stroke="none" fill="currentColor">
        ?
      </text>
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

function HomeIcon({ active }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  )
}
