import type { ChangeEntry } from '../../stores/digestStore'
import type { ChangeType } from '../../types/database'

const WINDOW_MS = 15 * 60 * 1000

export interface GroupedChange {
  key: string
  changeType: ChangeType
  user: ChangeEntry['user']
  activity: ChangeEntry['activity']
  createdAt: string
  count: number
  entries: ChangeEntry[]
}

// Same activity, same person, same kind of change, within 15 minutes of the
// previous entry in that running group — merged into one. Keeps a rapid
// string of "Michael updated The Vault" (or genuine duplicate "joined"
// rows) from burying everything else in the feed.
export function groupChangeEntries(entries: ChangeEntry[]): GroupedChange[] {
  const groups: GroupedChange[] = []

  for (const entry of entries) {
    const last = groups[groups.length - 1]
    const sameBucket =
      last &&
      last.changeType === entry.change_type &&
      last.activity?.id === entry.activity?.id &&
      last.user?.display_name === entry.user?.display_name
    const withinWindow =
      sameBucket &&
      Math.abs(
        new Date(last.entries[last.entries.length - 1].created_at).getTime() - new Date(entry.created_at).getTime(),
      ) <= WINDOW_MS

    if (sameBucket && withinWindow) {
      last.entries.push(entry)
      last.count += 1
    } else {
      groups.push({
        key: entry.id,
        changeType: entry.change_type,
        user: entry.user,
        activity: entry.activity,
        createdAt: entry.created_at,
        count: 1,
        entries: [entry],
      })
    }
  }

  return groups
}

// A verb phrase (replacing CHANGE_VERB for count-sensitive types) plus an
// optional detail line — e.g. the merged, de-duplicated list of what
// changed across a batch of "updated" edits.
export function groupSummary(group: GroupedChange): { verb: string; detail: string | null } {
  switch (group.changeType) {
    case 'photo_added':
      return { verb: group.count > 1 ? `added ${group.count} photos to` : 'added a photo to', detail: null }
    case 'invited':
      return {
        verb:
          group.count > 1
            ? `requested ${group.count} people join`
            : 'requested someone join',
        detail: null,
      }
    case 'updated': {
      const details = [
        ...new Set(
          group.entries.flatMap((e) => (e.summary_text ?? '').split(', ').filter(Boolean)),
        ),
      ]
      return { verb: 'updated', detail: details.length > 0 ? details.join(', ') : null }
    }
    default:
      return { verb: '', detail: null }
  }
}
