import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { useWeatherStore } from '../../stores/weatherStore'
import { ActivityCard } from './ActivityCard'
import { DigestBanner } from '../digest/DigestBanner'
import { TodayWeather } from './TodayWeather'
import { TRIP_DAYS } from '../../lib/days'
import { weatherIcon } from '../../lib/weather'
import type { ActivityCategory, ActivityType } from '../../types/database'

// Pulls in MapLibre (for the location-confirm preview) — keep it out of the
// initial bundle since most visits to this page won't open the modal.
const CreateActivityModal = lazy(() =>
  import('./CreateActivityModal').then((m) => ({ default: m.CreateActivityModal })),
)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ActivityListPage() {
  const { activities, loading, fetchActivities } = useActivitiesStore()
  const weatherDaily = useWeatherStore((s) => s.daily)
  const [showCreate, setShowCreate] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('activity')

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

  const byDay = (date: string) => filtered.filter((a) => a.proposed_date === date)
  const plannedCount = TRIP_DAYS.reduce((sum, d) => sum + byDay(d.date).length, 0)
  const today = todayIso()

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Planned</h1>

      <TodayWeather />

      <div className="mt-3">
        <DigestBanner />
      </div>

      <div className="sticky top-0 z-10 -mx-4 bg-bg/95 px-4 pb-2 pt-1 backdrop-blur-sm">
        <div className="flex gap-2">
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
      </div>

      {loading && <p className="mt-4 text-sm text-text-dim">Loading…</p>}

      {TRIP_DAYS.map((day) => {
        const dayActivities = byDay(day.date)
        if (dayActivities.length === 0) return null
        const weather = day.date !== today ? weatherDaily[day.date] : undefined
        return (
          <section key={day.date} className="mt-3">
            <h2 className="sticky top-[52px] z-10 mb-2 flex items-center gap-2 bg-bg/95 py-1.5 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim backdrop-blur-sm">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: day.color }} />
              {day.label}
              {weather && (
                <span className="font-data ml-auto text-xs font-normal normal-case">
                  {weatherIcon(weather.code)} {weather.tempMaxF}&deg;/{weather.tempMinF}&deg;
                </span>
              )}
            </h2>
            <div className="flex flex-col gap-2">
              {dayActivities.map((a) => (
                <ActivityCard key={a.id} activity={a} haloColor={day.color} highlightId={highlightId} />
              ))}
            </div>
          </section>
        )
      })}

      {!loading && plannedCount === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">
          Nothing scheduled yet — check the Unplanned tab for ideas, or add something new.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        aria-label="Add activity"
        className="card-shadow fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {showCreate && (
        <Suspense fallback={null}>
          <CreateActivityModal onClose={() => setShowCreate(false)} />
        </Suspense>
      )}
    </div>
  )
}
