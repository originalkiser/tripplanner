import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActivitiesStore } from '../../stores/activitiesStore'
import { useWeatherStore } from '../../stores/weatherStore'
import { ActivityCard } from './ActivityCard'
import { ActivityQuickView } from './ActivityQuickView'
import { PlannedCalendarView } from './PlannedCalendarView'
import { DigestBanner } from '../digest/DigestBanner'
import { TodayWeather } from './TodayWeather'
import { TRIP_DAYS } from '../../lib/days'
import { weatherIcon } from '../../lib/weather'
import type { ActivityType } from '../../types/database'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ActivityListPage() {
  const { activities, loading, fetchActivities } = useActivitiesStore()
  const weatherDaily = useWeatherStore((s) => s.daily)
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('activity')

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      return true
    })
  }, [activities, typeFilter])

  const byDay = (date: string) => filtered.filter((a) => a.proposed_date === date)
  const plannedCount = TRIP_DAYS.reduce((sum, d) => sum + byDay(d.date).length, 0)
  const today = todayIso()

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="sticky top-0 z-20 bg-bg px-4 pb-3 pt-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-primary">Planned</h1>
          <div className="flex rounded-full bg-surface-2 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-full px-3 py-1 ${view === 'list' ? 'bg-primary text-white' : 'text-text-dim'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`rounded-full px-3 py-1 ${view === 'calendar' ? 'bg-primary text-white' : 'text-text-dim'}`}
            >
              Calendar
            </button>
          </div>
        </div>

        <div className="mt-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
            className="card-shadow w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm sm:w-56"
          >
            <option value="all">All types</option>
            <option value="food">Food</option>
            <option value="activity">Activity</option>
            <option value="food_and_activity">Food & Activity</option>
          </select>
        </div>
      </div>

      <div className="p-4">
        <TodayWeather />

        <div className="mt-3">
          <DigestBanner onSelectActivity={setQuickViewId} />
        </div>

        {loading && <p className="mt-4 text-sm text-text-dim">Loading…</p>}

        {view === 'calendar' ? (
          <PlannedCalendarView activities={filtered} onSelect={setQuickViewId} />
        ) : (
          <>
            {TRIP_DAYS.map((day) => {
              const dayActivities = byDay(day.date)
              if (dayActivities.length === 0) return null
              const weather = day.date !== today ? weatherDaily[day.date] : undefined
              return (
                <section key={day.date} className="mt-4">
                  <h2 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: day.color }} />
                    {day.label}
                    {weather && (
                      <span className="font-data ml-auto text-xs font-normal normal-case">
                        {weatherIcon(weather.code)} {weather.tempMaxF}&deg;/{weather.tempMinF}&deg;
                      </span>
                    )}
                  </h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
          </>
        )}
      </div>

      {quickViewId && <ActivityQuickView activityId={quickViewId} onClose={() => setQuickViewId(null)} />}
    </div>
  )
}
