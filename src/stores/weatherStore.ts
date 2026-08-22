import { create } from 'zustand'
import { fetchDailyWeather, type DayWeather } from '../lib/weather'
import { TRIP_DAYS } from '../lib/days'

interface WeatherState {
  daily: Record<string, DayWeather>
  loaded: boolean
  fetch: () => Promise<void>
}

// Open-Meteo's forecast window is ~16 days out and rejects the *entire*
// request if any part of the range is beyond that — so if the trip's last
// day is out of range, clamp to what's actually available rather than
// losing weather for every day over one out-of-range date.
function maxForecastDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 15)
  return d.toISOString().slice(0, 10)
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  daily: {},
  loaded: false,

  fetch: async () => {
    if (get().loaded) return
    const first = TRIP_DAYS[0].date
    const last = TRIP_DAYS[TRIP_DAYS.length - 1].date
    const cappedLast = last < maxForecastDate() ? last : maxForecastDate()

    if (first > cappedLast) {
      set({ daily: {}, loaded: true })
      return
    }

    const daily = await fetchDailyWeather(first, cappedLast)
    set({ daily, loaded: true })
  },
}))
