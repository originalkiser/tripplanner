import { useEffect } from 'react'
import { useWeatherStore } from '../../stores/weatherStore'
import { weatherIcon, weatherLabel } from '../../lib/weather'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TodayWeather() {
  const { daily, fetch } = useWeatherStore()

  useEffect(() => {
    void fetch()
  }, [fetch])

  const today = daily[todayIso()]
  if (!today) return null

  return (
    <div className="card-shadow mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <span className="text-3xl">{weatherIcon(today.code)}</span>
      <div>
        <p className="text-sm font-medium">Today &middot; {weatherLabel(today.code)}</p>
        <p className="font-data text-xs text-text-dim">
          {today.tempMaxF}&deg; / {today.tempMinF}&deg;
        </p>
      </div>
    </div>
  )
}
