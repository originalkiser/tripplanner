export interface TripDay {
  date: string
  label: string
  shortLabel: string
  color: string
}

// Halo color per day — a quick visual "which day is this" cue on cards.
export const TRIP_DAYS: TripDay[] = [
  { date: '2026-09-04', label: 'Friday, Sept 4', shortLabel: 'Fri Sept 4', color: 'var(--color-primary)' },
  { date: '2026-09-05', label: 'Saturday, Sept 5', shortLabel: 'Sat Sept 5', color: 'var(--color-accent)' },
  { date: '2026-09-06', label: 'Sunday, Sept 6', shortLabel: 'Sun Sept 6', color: 'var(--color-secondary)' },
  { date: '2026-09-07', label: 'Monday, Sept 7', shortLabel: 'Mon Sept 7', color: 'var(--color-coral)' },
]

export function dayColor(date: string | null): string | null {
  return TRIP_DAYS.find((d) => d.date === date)?.color ?? null
}
