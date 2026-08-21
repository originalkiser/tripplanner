import { useEffect, useState } from 'react'
import { useDigestStore } from '../../stores/digestStore'
import { CHANGE_VERB } from './changeLabels'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDay(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DigestPage() {
  const [date, setDate] = useState(todayIso())
  const { dayEntries, loadingDay, fetchDay } = useDigestStore()

  useEffect(() => {
    void fetchDay(date)
  }, [date, fetchDay])

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <h1 className="text-2xl font-semibold text-primary">Daily Digest</h1>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDate((d) => shiftDay(d, -1))}
          className="rounded-lg bg-surface px-3 py-1.5 text-sm shadow-sm"
        >
          &larr; Prev
        </button>
        <span className="font-heading text-sm font-medium">{formatDay(date)}</span>
        <button
          type="button"
          onClick={() => setDate((d) => shiftDay(d, 1))}
          className="rounded-lg bg-surface px-3 py-1.5 text-sm shadow-sm"
        >
          Next &rarr;
        </button>
      </div>

      {loadingDay && <p className="mt-4 text-sm opacity-60">Loading…</p>}

      {!loadingDay && dayEntries.length === 0 && (
        <p className="mt-8 text-center text-sm opacity-60">Nothing happened this day.</p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {dayEntries.map((e) => (
          <li key={e.id} className="rounded-xl bg-surface p-3 text-sm shadow-sm">
            <span className="font-medium">{e.user?.display_name ?? 'Someone'}</span>{' '}
            {CHANGE_VERB[e.change_type]}{' '}
            <span className="font-medium">{e.activity?.name ?? 'an activity'}</span>
            {e.summary_text && <p className="mt-1 text-xs opacity-60">{e.summary_text}</p>}
            <p className="font-data mt-1 text-[11px] opacity-50">
              {new Date(e.created_at).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
