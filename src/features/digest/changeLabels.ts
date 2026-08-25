import type { ChangeType } from '../../types/database'

export const CHANGE_VERB: Record<ChangeType, string> = {
  created: 'added',
  updated: 'updated',
  joined: 'joined',
  left: 'left',
  invited: 'requested someone join',
  proposed_time: 'proposed a new time for',
  photo_added: 'added a photo to',
  comment: 'commented on',
}

export const CHANGE_GROUP_LABEL: Record<ChangeType, string> = {
  created: 'New activities',
  updated: 'Updated',
  joined: 'New joins',
  left: 'People who left',
  invited: 'New join requests',
  proposed_time: 'New proposed times',
  photo_added: 'New photos',
  comment: 'New comments',
}
