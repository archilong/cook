import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { CookingOrder } from "@/features/orders/types";

const reminderKeyPrefix = "cook_picture:order_reminder:";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export type LocalReminderResult =
  | { status: "scheduled"; notificationId: string }
  | { status: "unsupported" }
  | { status: "permission-denied" }
  | { status: "missing-time" }
  | { status: "past" }
  | { status: "cancelled" };

function reminderKey(orderId: number): string {
  return `${reminderKeyPrefix}${orderId}`;
}

export function buildReminderDate(order: CookingOrder): Date | null {
  if (!order.reminder_time) {
    return null;
  }
  const reminderDate = new Date(order.reminder_time);
  return Number.isNaN(reminderDate.getTime()) ? null : reminderDate;
}

async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelOrderReminder(orderId: number): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  const key = reminderKey(orderId);
  const notificationId = await AsyncStorage.getItem(key);
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await AsyncStorage.removeItem(key);
  }
}

export async function scheduleOrderReminder(order: CookingOrder): Promise<LocalReminderResult> {
  if (Platform.OS === "web") {
    return { status: "unsupported" };
  }
  const reminderDate = buildReminderDate(order);
  if (!reminderDate) {
    return { status: "missing-time" };
  }
  if (reminderDate.getTime() <= Date.now()) {
    await cancelOrderReminder(order.id);
    return { status: "past" };
  }
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return { status: "permission-denied" };
  }
  await cancelOrderReminder(order.id);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "做饭提醒",
      body: `别忘了准备「${order.recipe_title_snapshot}」。`,
      data: { orderId: order.id }
    },
    trigger: reminderDate
  });
  await AsyncStorage.setItem(reminderKey(order.id), notificationId);
  return { status: "scheduled", notificationId };
}
