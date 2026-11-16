import type { AdminNotification } from './notification.service';

export function notificationDestination(item: Pick<AdminNotification, 'title' | 'message' | 'type' | 'data' | 'link'>): string | null;
