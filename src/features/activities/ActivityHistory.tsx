import { useState } from 'react'
import type { ChangeEntry } from '../../stores/digestStore'
import type { ChangeType } from '../../types/database'

const COLLAPSED_COUNT = 2

// Phrasing tailored for a single-activity timeline, where the activity
// doesn't need to be named again (unlike the cross-activity digest, which
// reuses CHANGE_VERB from changeLabels.ts for that reason).
const HISTORY_LABEL: Record<ChangeType, string> = {
  created: 'added this activity',
  updated: 'updated this activity',
  joined: 'joined',
  left: 'left',
  invited: 'requested someone join',
  proposed_time: 'proposed a new time',
  photo_added: 'added a photo',
  comment: 'commented',
}

interface DisplayEntry {
  key: string
  text: string
  createdAt: string
}

function formatHistoryTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Consecutive photo_added or invited entries from the same person collapse
// into one "added N photos" / "requested N people join" line instead of a
// line per photo or per invite.
function buildDisplayEntries(entries: ChangeEntry[]): DisplayEntry[] {
  const result: DisplayEntry[] = []
  let i = 0
  while (i < entries.length) {
    const entry = entries[i]
    const name = entry.user?.display_name ?? 'Someone'

    if (entry.change_type === 'photo_added' || entry.change_type === 'invited') {
      let j = i
      while (j < entries.length && entries[j].change_type === entry.change_type && entries[j].user?.display_name === name) {
        j++
      }
      const count = j - i
      const text =
        entry.change_type === 'photo_added'
          ? `${name} added ${count} photo${count === 1 ? '' : 's'}`
          : `${name} requested ${count} ${count === 1 ? 'person' : 'people'} join`
      result.push({ key: entry.id, text, createdAt: entries[j - 1].created_at })
      i = j
      continue
    }

    const detail = entry.change_type === 'updated' && entry.summary_text ? ` (${entry.summary_text})` : ''
    result.push({
      key: entry.id,
      text: `${name} ${HISTORY_LABEL[entry.change_type]}${detail}`,
      createdAt: entry.created_at,
    })
    i++
  }
  return result
}

export function ActivityHistory({ entries }: { entries: ChangeEntry[] }) {
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) {
    return <p className="text-xs text-text-dim opacity-60">No history yet.</p>
  }

  const display = buildDisplayEntries(entries)
  const visible = expanded ? display : display.slice(-COLLAPSED_COUNT)
  const hiddenCount = display.length - visible.length

  return (
    <div className="flex flex-col gap-1.5">
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-xs text-primary underline"
        >
          Show {hiddenCount} more
        </button>
      )}
      <ul className="flex flex-col gap-1.5">
        {visible.map((d) => (
          <li key={d.key} className="text-xs">
            <span>{d.text}</span> <span className="text-text-dim opacity-70">· {formatHistoryTime(d.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
