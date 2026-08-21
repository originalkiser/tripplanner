import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'List', end: true },
  { to: '/map', label: 'Map', end: false },
  { to: '/digest', label: 'Digest', end: false },
  { to: '/profile', label: 'Profile', end: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-bg text-text">
      <main className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 flex border-t border-secondary/20 bg-surface pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium ${
                isActive ? 'text-primary' : 'text-text/60'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
