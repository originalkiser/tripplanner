import type { Activity } from '../../stores/activitiesStore'
import { useWeatherStore } from '../../stores/weatherStore'
import { weatherIcon } from '../../lib/weather'
import { TRIP_DAYS } from '../../lib/days'

const START_HOUR = 8
const END_HOUR = 23
const ROW_HEIGHT = 44

function hourLabel(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12} ${ampm}`
}

function minutesFromMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Outlook/Teams-style week grid: one column per trip day, events placed at
// their approximate vertical time position. Activities without a time land
// in an "all day" strip at the top of their column.
export function PlannedCalendarView({
  activities,
  onSelect,
}: {
  activities: Activity[]
  onSelect: (id: string) => void
}) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const gridHeight = hours.length * ROW_HEIGHT
  const weatherDaily = useWeatherStore((s) => s.daily)

  const byDay = (date: string) => activities.filter((a) => a.proposed_date === date)

  return (
    <div className="card-shadow mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
      <div className="flex min-w-[640px]">
        <div className="w-14 shrink-0 border-r border-line">
          <div className="h-14 border-b border-line" />
          {hours.map((h) => (
            <div key={h} className="border-b border-line/50 pr-1.5 text-right text-[10px] text-text-dim" style={{ height: ROW_HEIGHT }}>
              {hourLabel(h)}
            </div>
          ))}
        </div>

        {TRIP_DAYS.map((day) => {
          const dayActivities = byDay(day.date)
          const timed = dayActivities.filter((a) => a.proposed_time)
          const allDay = dayActivities.filter((a) => !a.proposed_time)
          const weather = weatherDaily[day.date]?.code != null ? weatherDaily[day.date] : undefined
          return (
            <div key={day.date} className="flex-1 border-r border-line last:border-r-0">
              <div className="flex h-14 flex-col items-center justify-center border-b border-line px-1">
                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: day.color }} />
                  {day.shortLabel}
                </span>
                {weather && (
                  <span className="font-data text-[10px] text-text-dim">
                    {weatherIcon(weather.code)} {weather.tempMaxF}&deg;/{weather.tempMinF}&deg;
                  </span>
                )}
                {allDay.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap justify-center gap-1">
                    {allDay.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a.id)}
                        className="max-w-[80px] truncate rounded px-1 text-[10px]"
                        style={{ background: `${day.color}33` }}
                        title={a.name}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" style={{ height: gridHeight }}>
                {hours.map((h) => (
                  <div key={h} className="border-b border-line/50" style={{ height: ROW_HEIGHT }} />
                ))}
                {timed.map((a) => {
                  const mins = minutesFromMidnight(a.proposed_time!)
                  const top = ((mins - START_HOUR * 60) / 60) * ROW_HEIGHT
                  if (top < -ROW_HEIGHT || top > gridHeight) return null
                  // Activities created before duration tracking existed (or
                  // left it unset) fall back to a plain 1-hour block instead
                  // of collapsing to a sliver.
                  const durationMin = a.duration_minutes ?? 60
                  const height = Math.max((durationMin / 60) * ROW_HEIGHT - 4, 18)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a.id)}
                      className="card-shadow absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-white"
                      style={{ top: Math.max(top, 0), background: day.color, height }}
                      title={a.name}
                    >
                      <span className="block truncate">{a.name}</span>
                      {height >= ROW_HEIGHT && (
                        <span className="block truncate text-[10px] font-normal opacity-85">
                          {formatDuration(durationMin)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
