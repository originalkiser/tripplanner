// Open-Meteo is free and keyless — fine to call directly from the client.
// Forecasts only exist ~16 days out, so most of the year this quietly
// returns nothing for the trip dates; that's expected, not a bug.
const SAVANNAH_LAT = 32.0809
const SAVANNAH_LNG = -81.0912

export interface DayWeather {
  date: string
  code: number
  tempMaxF: number
  tempMinF: number
}

const WEATHER_ICON: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌦️',
  56: '🌧️',
  57: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  66: '🌧️',
  67: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  77: '🌨️',
  80: '🌦️',
  81: '🌧️',
  82: '⛈️',
  85: '🌨️',
  86: '🌨️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
}

const WEATHER_LABEL: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorms',
  96: 'Thunderstorms',
  99: 'Thunderstorms',
}

export function weatherIcon(code: number): string {
  return WEATHER_ICON[code] ?? '🌡️'
}

export function weatherLabel(code: number): string {
  return WEATHER_LABEL[code] ?? 'Weather'
}

export async function fetchDailyWeather(startDate: string, endDate: string): Promise<Record<string, DayWeather>> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(SAVANNAH_LAT))
  url.searchParams.set('longitude', String(SAVANNAH_LNG))
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('timezone', 'America/New_York')
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)

  try {
    const res = await fetch(url)
    if (!res.ok) return {}
    const data = await res.json()
    const days: string[] = data.daily?.time ?? []
    const codes: number[] = data.daily?.weathercode ?? []
    const maxes: number[] = data.daily?.temperature_2m_max ?? []
    const mins: number[] = data.daily?.temperature_2m_min ?? []

    const result: Record<string, DayWeather> = {}
    days.forEach((date, i) => {
      result[date] = { date, code: codes[i], tempMaxF: Math.round(maxes[i]), tempMinF: Math.round(mins[i]) }
    })
    return result
  } catch {
    return {}
  }
}
