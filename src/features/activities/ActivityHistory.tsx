import type { ChangeEntry } from '../../stores/digestStore'
import type { ChangeType } from '../../types/database'

// Phrasing tailored for a single-activity timeline, where the activity
// doesn't need to be named again (unlike the cross-activity digest, which
// reuses CHANGE_VERB from changeLabels.ts for that reason).
const HISTORY_LABEL: Record<ChangeType, string> = {
  created: 'added this activity',
  updated: 'updated this activity',
  joined: 'joined',
  left: 'left',
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

// Consecutive photo_added entries from the same person collapse into one
// "added N photos" line instead of a line per photo.
function buildDisplayEntries(entries: ChangeEntry[]): DisplayEntry[] {
  const result: DisplayEntry[] = []
  let i = 0
  while (i < entries.length) {
    const entry = entries[i]
    const name = entry.user?.display_name ?? 'Someone'

    if (entry.change_type === 'photo_added') {
      let j = i
      while (j < entries.length && entries[j].change_type === 'photo_added' && entries[j].user?.display_name === name) {
        j++
      }
      const count = j - i
      result.push({
        key: entry.id,
        text: `${name} added ${count} photo${count === 1 ? '' : 's'}`,
        createdAt: entries[j - 1].created_at,
      })
      i = j
      continue
    }

    result.push({ key: entry.id, text: `${name} ${HISTORY_LABEL[entry.change_type]}`, createdAt: entry.created_at })
    i++
  }
  return result
}

export function ActivityHistory({ entries }: { entries: ChangeEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-text-dim opacity-60">No history yet.</p>
  }

  const display = buildDisplayEntries(entries)

  return (
    <ul className="flex flex-col gap-1.5">
      {display.map((d) => (
        <li key={d.key} className="text-xs">
          <span>{d.text}</span> <span className="text-text-dim opacity-70">· {formatHistoryTime(d.createdAt)}</span>
        </li>
      ))}
    </ul>
  )
}
