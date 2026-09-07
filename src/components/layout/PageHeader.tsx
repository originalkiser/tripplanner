import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentTripName } from '../../lib/tripNameStore'

// The sticky header every page collapses to once the (now in-flow, no
// longer fixed) hero scene scrolls past — showing the trip you're
// currently viewing alongside the page's own title, so "which trip am I
// looking at" is never a mystery once the hero art is gone. Replaces each
// page's previously hand-rolled sticky div.
export function PageHeader({
  title,
  titleClassName,
  subtitle,
  backTo,
  backLabel,
  action,
  bleed = true,
  children,
}: {
  title: string
  titleClassName?: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
  // Pages whose container already has no padding (so there's nothing for a
  // negative margin to counteract) pass bleed={false}.
  bleed?: boolean
  children?: ReactNode
}) {
  const tripName = useCurrentTripName()

  return (
    <div
      className={`sticky top-0 z-20 bg-bg px-4 pb-3 pt-4 shadow-sm ${bleed ? '-mx-4 -mt-4' : ''}`}
    >
      {backTo && (
        <Link to={backTo} className="text-sm text-primary underline">
          &larr; {backLabel ?? 'Back'}
        </Link>
      )}
      {tripName && (
        <p className={`truncate text-[11px] font-medium uppercase tracking-wide text-text-dim ${backTo ? 'mt-2' : ''}`}>
          {tripName}
        </p>
      )}
      <div className={`flex items-center justify-between gap-2 ${backTo && !tripName ? 'mt-2' : ''}`}>
        <h1 className={titleClassName ?? 'text-2xl font-semibold text-primary'}>{title}</h1>
        {action}
      </div>
      {subtitle && <p className="mt-1 text-sm text-text-dim">{subtitle}</p>}
      {children}
    </div>
  )
}
