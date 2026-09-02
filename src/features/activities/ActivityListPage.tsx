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
  const [showImported, setShowImported] = useState(true)
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

  const hasEngagement = (a: (typeof filtered)[number]) =>
    a.participants.some((p) => p.status === 'joined' || p.status === 'proposed_alt_time')

  // Still unplanned, but someone's already joined or suggested a day/time
  // for it — surfaced here since it's no longer just an idea.
  const needsScheduling = filtered.filter((a) => !a.proposed_date && hasEngagement(a))

  // Everything else unplanned — no day, and nobody's engaged with it yet.
  // Plans and Unplanned used to be separate tabs; this is that tab's content
  // folded into its own section here instead, split the same way it always
  // was (bulk-imported ideas collapsed by default, everything else open).
  const unplanned = filtered.filter((a) => !a.proposed_date && !hasEngagement(a))
  const importedIdeas = unplanned.filter((a) => a.source === 'imported_note')
  const otherIdeas = unplanned.filter((a) => a.source !== 'imported_note')

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="sticky top-0 z-20 bg-bg px-4 pb-3 pt-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-primary">Plans</h1>
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
              const dayWeather = weatherDaily[day.date]
              const weather = day.date !== today && dayWeather?.code != null ? dayWeather : undefined
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
                  <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {dayActivities.map((a) => (
                      <ActivityCard key={a.id} activity={a} haloColor={day.color} highlightId={highlightId} />
                    ))}
                  </div>
                </section>
              )
            })}

            {!loading && plannedCount === 0 && needsScheduling.length === 0 && unplanned.length === 0 && (
              <p className="mt-8 text-center text-sm text-text-dim">
                Nothing here yet — add something new to get started.
              </p>
            )}

            {needsScheduling.length > 0 && (
              <section className="mt-4">
                <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim">
                  Needs Scheduling
                </h2>
                <p className="-mt-1 mb-2 text-xs text-text-dim">
                  Not on the calendar yet, but people are in — propose a time, or click an already
                  proposed one to make it official.
                </p>
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {needsScheduling.map((a) => (
                    <ActivityCard key={a.id} activity={a} highlightId={highlightId} scheduleCallout />
                  ))}
                </div>
              </section>
            )}

            {otherIdeas.length > 0 && (
              <section className="mt-4">
                <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-text-dim">
                  Unplanned
                </h2>
                <p className="-mt-1 mb-2 text-xs text-text-dim">
                  Ideas without a day yet and nobody's joined in — schedule one from its card, or
                  pull from the shared note.
                </p>
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {otherIdeas.map((a) => (
                    <ActivityCard key={a.id} activity={a} highlightId={highlightId} />
                  ))}
                </div>
              </section>
            )}

            {importedIdeas.length > 0 && (
              <section className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowImported((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
                >
                  Imported from shared note ({importedIdeas.length})
                  <span>{showImported ? '−' : '+'}</span>
                </button>
                {showImported && (
                  <div className="mt-2 grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {importedIdeas.map((a) => (
                      <ActivityCard key={a.id} activity={a} highlightId={highlightId} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {quickViewId && <ActivityQuickView activityId={quickViewId} onClose={() => setQuickViewId(null)} />}
    </div>
  )
}
