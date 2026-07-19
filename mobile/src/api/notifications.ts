import { AppNotification, NotificationReadAllResult } from "@/features/notifications/types";

import { apiGet, apiPost } from "./client";

export function listNotifications(): Promise<AppNotification[]> {
  return apiGet<AppNotification[]>("/notifications", { auth: true });
}

export function markNotificationRead(id: number): Promise<AppNotification> {
  return apiPost<AppNotification>(`/notifications/${id}/read`, undefined, { auth: true });
}

export function markAllNotificationsRead(): Promise<NotificationReadAllResult> {
  return apiPost<NotificationReadAllResult>("/notifications/read-all", undefined, { auth: true });
}
