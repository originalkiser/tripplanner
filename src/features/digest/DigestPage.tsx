import { useEffect, useState } from 'react'
import { useDigestStore } from '../../stores/digestStore'
import { ActivityQuickView } from '../activities/ActivityQuickView'
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
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
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
          className="card-shadow rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          &larr; Prev
        </button>
        <span className="font-heading text-sm font-medium">{formatDay(date)}</span>
        <button
          type="button"
          onClick={() => setDate((d) => shiftDay(d, 1))}
          className="card-shadow rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          Next &rarr;
        </button>
      </div>

      {loadingDay && <p className="mt-4 text-sm text-text-dim">Loading…</p>}

      {!loadingDay && dayEntries.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">Nothing happened this day.</p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {dayEntries.map((e) => {
          return (
            <li key={e.id} className="card-shadow rounded-xl border border-line bg-surface p-3 text-sm">
              <span className="font-medium">{e.user?.display_name ?? 'Someone'}</span>{' '}
              {CHANGE_VERB[e.change_type]}{' '}
              {e.activity ? (
                <button
                  type="button"
                  onClick={() => setQuickViewId(e.activity!.id)}
                  className="font-medium text-primary underline"
                >
                  {e.activity.name}
                </button>
              ) : (
                <span className="font-medium">an activity</span>
              )}
              {e.summary_text && <p className="mt-1 text-xs text-text-dim">{e.summary_text}</p>}
              <p className="font-data mt-1 text-[11px] text-text-dim">
                {new Date(e.created_at).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </li>
          )
        })}
      </ul>

      {quickViewId && <ActivityQuickView activityId={quickViewId} onClose={() => setQuickViewId(null)} />}
    </div>
  )
}
