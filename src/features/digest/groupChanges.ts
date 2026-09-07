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

// Types whose count is what matters ("Michael liked 6 photos") rather than
// which specific activity (or none, for a general album photo) each one
// happened to touch — grouped by person and type alone so a session that
// touches several activities/the general album still reads as one line
// instead of splintering per-target.
const IGNORES_ACTIVITY_FOR_GROUPING = new Set<ChangeType>(['photo_added', 'photo_liked'])

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
      (IGNORES_ACTIVITY_FOR_GROUPING.has(entry.change_type) || last.activity?.id === entry.activity?.id) &&
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
    case 'photo_liked':
      // Deliberately no trailing "to <target>" — a like isn't "to" a photo
      // the way an upload is "to" an album, and batches liked photos from
      // across an activity and the general album alike, so "liked N photos"
      // reads right regardless of what's actually behind it.
      return { verb: group.count > 1 ? `liked ${group.count} photos` : 'liked a photo', detail: null }
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

// The clickable "target" noun phrase after the verb — an activity name when
// there is one, "the trip album" for a general (not activity-linked) photo
// upload, or nothing at all for a like (groupSummary's verb is already a
// complete phrase for that type). Centralizes what was previously a
// hardcoded "an activity" fallback in both DigestPage and DigestBanner,
// which read as flatly wrong for anything without an activity.
export function groupTargetLabel(group: GroupedChange): string | null {
  if (group.activity) return group.activity.name
  if (group.changeType === 'photo_added') return 'the trip album'
  if (group.changeType === 'photo_liked') return null
  return 'an activity'
}
