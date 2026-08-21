import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useActivitiesStore, type Activity } from '../../stores/activitiesStore'
import { ActivityCard } from './ActivityCard'
import { DigestBanner } from '../digest/DigestBanner'
import type { ActivityCategory, ActivityType } from '../../types/database'

// Pulls in MapLibre (for the location-confirm preview) — keep it out of the
// initial bundle since most visits to this page won't open the modal.
const CreateActivityModal = lazy(() =>
  import('./CreateActivityModal').then((m) => ({ default: m.CreateActivityModal })),
)

const DAYS = [
  { date: '2026-09-04', label: 'Friday, Sept 4' },
  { date: '2026-09-05', label: 'Saturday, Sept 5' },
  { date: '2026-09-06', label: 'Sunday, Sept 6' },
  { date: '2026-09-07', label: 'Monday, Sept 7' },
]

export function ActivityListPage() {
  const { activities, loading, fetchActivities } = useActivitiesStore()
  const [showCreate, setShowCreate] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [showImported, setShowImported] = useState(true)

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      return true
    })
  }, [activities, categoryFilter, typeFilter])

  const dayDates = new Set(DAYS.map((d) => d.date))
  const byDay = (date: string) => filtered.filter((a) => a.proposed_date === date)
  const imported = filtered.filter((a) => !a.proposed_date && a.source === 'imported_note')
  const unscheduled = filtered.filter(
    (a) => !a.proposed_date && a.source !== 'imported_note',
  )
  const orphanScheduled = filtered.filter(
    (a) => a.proposed_date && !dayDates.has(a.proposed_date),
  )

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Activities</h1>

      <div className="mt-3">
        <DigestBanner />
      </div>

      <div className="mt-3 flex gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ActivityCategory | 'all')}
          className="flex-1 rounded-lg border border-secondary/30 bg-surface px-2 py-1.5 text-sm"
        >
          <option value="all">All places</option>
          <option value="savannah">Savannah</option>
          <option value="tybee">Tybee</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
          className="flex-1 rounded-lg border border-secondary/30 bg-surface px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="food">Food</option>
          <option value="activity">Activity</option>
          <option value="food_and_activity">Food & Activity</option>
        </select>
      </div>

      {loading && <p className="mt-4 text-sm opacity-60">Loading…</p>}

      {imported.length > 0 && (
        <section className="mt-5">
          <button
            type="button"
            onClick={() => setShowImported((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
          >
            Imported from shared note ({imported.length})
            <span>{showImported ? '−' : '+'}</span>
          </button>
          {showImported && (
            <div className="mt-2 flex flex-col gap-2">
              {imported.map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </div>
          )}
        </section>
      )}

      {DAYS.map((day) => {
        const dayActivities = byDay(day.date)
        if (dayActivities.length === 0) return null
        return (
          <section key={day.date} className="mt-5">
            <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide opacity-70">
              {day.label}
            </h2>
            <div className="flex flex-col gap-2">
              {dayActivities.map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </div>
          </section>
        )
      })}

      {orphanScheduled.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide opacity-70">
            Other dates
          </h2>
          <div className="flex flex-col gap-2">
            {orphanScheduled.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        </section>
      )}

      {unscheduled.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide opacity-70">
            Unscheduled
          </h2>
          <div className="flex flex-col gap-2">
            {unscheduled.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        </section>
      )}

      {!loading && filtered.length === 0 && (
        <p className="mt-8 text-center text-sm opacity-60">Nothing here yet — add the first one.</p>
      )}

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        aria-label="Add activity"
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl font-light text-white shadow-lg"
      >
        +
      </button>

      {showCreate && (
        <Suspense fallback={null}>
          <CreateActivityModal onClose={() => setShowCreate(false)} />
        </Suspense>
      )}
    </div>
  )
}

export type { Activity }
