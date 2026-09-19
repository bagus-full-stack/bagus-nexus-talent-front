import { apiFetch } from "@/lib/api/client";
import { NotificationItem, NotificationType } from "@/types/notification";

type BackendNotificationType = "cv_echec" | "gdpr_terminee" | "invitation_envoyee";

interface BackendNotification {
  id: string;
  type: BackendNotificationType;
  texte: string;
  lu: boolean;
  date_creation: string;
}

interface PaginatedNotifications {
  items: BackendNotification[];
  page: number;
  limit: number;
  total: number;
  non_lues: number;
}

const TYPE_META: Record<BackendNotificationType, { title: string; type: NotificationType; link: string }> = {
  cv_echec: { title: "Échec d'analyse CV", type: "alert", link: "/ingestion" },
  gdpr_terminee: { title: "Demande RGPD terminée", type: "success", link: "/gdpr" },
  invitation_envoyee: { title: "Invitation envoyée", type: "info", link: "/users" },
};

function toNotificationItem(n: BackendNotification): NotificationItem {
  const meta = TYPE_META[n.type];
  return {
    id: n.id,
    title: meta.title,
    description: n.texte,
    timestamp: new Date(n.date_creation).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    read: n.lu,
    type: meta.type,
    link: meta.link,
  };
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await apiFetch<PaginatedNotifications>("/api/v1/notifications/?page=1&limit=50");
  return res.items.map(toNotificationItem);
}

export async function markAllAsRead(): Promise<NotificationItem[]> {
  const res = await apiFetch<PaginatedNotifications>("/api/v1/notifications/read-all", { method: "PATCH" });
  return res.items.map(toNotificationItem);
}
