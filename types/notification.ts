export type NotificationType = 'info' | 'success' | 'warning' | 'alert';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  link?: string;
}
