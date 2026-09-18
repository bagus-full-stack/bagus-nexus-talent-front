import { NotificationItem } from '@/types/notification';
import notificationsData from '@/lib/mock-data/notifications.json';

const simulateNetworkDelay = (min = 300, max = 800) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export async function fetchNotifications(): Promise<NotificationItem[]> {
  await simulateNetworkDelay(250, 500);
  return notificationsData as NotificationItem[];
}
