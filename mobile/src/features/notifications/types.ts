export type NotificationType =
  | "order_assigned"
  | "order_accepted"
  | "order_completed"
  | "order_cancelled"
  | "family_joined";

export type AppNotification = {
  id: number;
  recipient_user_id: number;
  family_id: number | null;
  order_id: number | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type NotificationReadAllResult = {
  updated_count: number;
};
