import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useDigestStore } from '../../stores/digestStore'
import { ActivityQuickView } from '../activities/ActivityQuickView'
import { CHANGE_VERB } from './changeLabels'
import { groupChangeEntries, groupSummary } from './groupChanges'

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
  const profile = useAuthStore((s) => s.profile)
  const [date, setDate] = useState(todayIso())
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const { dayEntries, loadingDay, fetchDay } = useDigestStore()

  useEffect(() => {
    void fetchDay(date)
  }, [date, fetchDay])

  // Your own actions aren't news to you — this is meant to show what
  // everyone *else* on the trip has been up to.
  const others = dayEntries.filter((e) => e.user_id !== profile?.id)

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

      {!loadingDay && others.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-dim">Nothing happened this day.</p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {groupChangeEntries(others).map((g) => {
          const { verb, detail } = groupSummary(g)
          return (
            <li key={g.key} className="card-shadow rounded-xl border border-line bg-surface p-3 text-sm">
              <span className="font-medium">{g.user?.display_name ?? 'Someone'}</span>{' '}
              {verb || CHANGE_VERB[g.changeType]}{' '}
              {g.activity ? (
                <button
                  type="button"
                  onClick={() => setQuickViewId(g.activity!.id)}
                  className="font-medium text-primary underline"
                >
                  {g.activity.name}
                </button>
              ) : (
                <span className="font-medium">an activity</span>
              )}
              {detail && <p className="mt-1 text-xs text-text-dim">{detail}</p>}
              <p className="font-data mt-1 text-[11px] text-text-dim">
                {new Date(g.createdAt).toLocaleTimeString(undefined, {
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
