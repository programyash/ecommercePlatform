// The bell menu, per portal persona.

import type { View } from '../view'
import type { ID, Notification, Portal } from '../types'

export function getNotifications(view: View, portal: Portal, audienceId: ID, limit = 20): Notification[] {
  return view.notifications
    .filter((notification) => notification.portal === portal && notification.audienceId === audienceId)
    .slice(0, limit)
}

export function getUnreadCount(view: View, portal: Portal, audienceId: ID): number {
  return view.notifications.filter(
    (notification) => notification.portal === portal && notification.audienceId === audienceId && !notification.read,
  ).length
}

/** The admin activity log, newest first. */
export function getAuditLog(view: View, filters: { targetType?: string; targetId?: ID; limit?: number } = {}) {
  return view.audit
    .filter((entry) => !filters.targetType || entry.targetType === filters.targetType)
    .filter((entry) => !filters.targetId || entry.targetId === filters.targetId)
    .slice(0, filters.limit ?? 50)
}
