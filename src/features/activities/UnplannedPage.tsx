import { useEffect, useMemo, useState } from 'react'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { ActivityCard } from './ActivityCard'
import type { ActivityCategory, ActivityType } from '../../types/database'

export function UnplannedPage() {
  const { activities, loading, fetchActivities } = useActivitiesStore()
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [showImported, setShowImported] = useState(true)

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (a.proposed_date) return false
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      return true
    })
  }, [activities, categoryFilter, typeFilter])

  const imported = filtered.filter((a) => a.source === 'imported_note')
  const unscheduled = filtered.filter((a) => a.source !== 'imported_note')

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Unplanned</h1>
      <p className="mt-1 text-sm text-text-dim">
        Ideas without a day yet — schedule one from its card, or pull from the shared note.
      </p>

      <div className="mt-3 flex gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ActivityCategory | 'all')}
          className="card-shadow flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
        >
          <option value="all">All places</option>
          <option value="savannah">Savannah</option>
          <option value="tybee">Tybee</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
          className="card-shadow flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="food">Food</option>
          <option value="activity">Activity</option>
          <option value="food_and_activity">Food & Activity</option>
        </select>
      </div>

      {loading && <p className="mt-4 text-sm text-text-dim">Loading…</p>}

      {unscheduled.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim">
            Not yet scheduled
          </h2>
          <div className="flex flex-col gap-2">
            {unscheduled.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        </section>
      )}

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

      {!loading && filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">Nothing unplanned right now.</p>
      )}
    </div>
  )
}
