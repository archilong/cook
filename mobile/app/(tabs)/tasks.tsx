import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/notifications";
import { acceptOrder, cancelOrder, completeOrder, listMyOrders, updateOrderReminder } from "@/api/orders";
import { getMySettings } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { AppNotification } from "@/features/notifications/types";
import { CookingOrder, CookingOrderStatus, MealSlot } from "@/features/orders/types";
import { cancelOrderReminder, scheduleOrderReminder } from "@/features/reminders/localReminders";
import { useAppTheme } from "@/theme/ThemeProvider";

const mealSlotLabels: Record<MealSlot, string> = {
  breakfast: "早餐",
  morning_tea: "上午茶",
  lunch: "午餐",
  afternoon_tea: "下午茶",
  dinner: "晚餐",
  late_night_snack: "夜宵"
};

const statusLabels: Record<CookingOrderStatus, string> = {
  pending_acceptance: "待接单",
  accepted: "已接单",
  completed: "已完成",
  cancelled: "已取消"
};

function computeReminderIso(order: CookingOrder, defaultMinutes: number): string | null {
  if (!order.scheduled_time) {
    return null;
  }
  const date = new Date(`${order.scheduled_date}T${order.scheduled_time}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const reminderTime = date.getTime() - defaultMinutes * 60 * 1000;
  if (reminderTime <= Date.now()) {
    return null;
  }
  return new Date(reminderTime).toISOString();
}

function reminderLabel(reminderTime: string | null): string {
  if (!reminderTime) {
    return "未设置提醒";
  }
  const date = new Date(reminderTime);
  if (Number.isNaN(date.getTime())) {
    return "提醒时间无效";
  }
  return `提醒：${date.toLocaleString()}`;
}

export default function TasksScreen() {
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<"requested" | "assigned" | "completedAssigned">("assigned");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: listMyOrders });
  const notificationsQuery = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });
  const settingsQuery = useQuery({ queryKey: ["my-settings"], queryFn: getMySettings });
  const invalidateAfterAction = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
  const acceptMutation = useMutation({
    mutationFn: async (order: CookingOrder) => {
      const accepted = await acceptOrder(order.id);
      const settings = settingsQuery.data;
      if (!settings?.notifications_enabled) {
        return accepted;
      }
      const reminderIso = computeReminderIso(accepted, settings.default_reminder_minutes);
      if (!reminderIso) {
        return accepted;
      }
      const updated = await updateOrderReminder(accepted.id, { reminder_time: reminderIso });
      const result = await scheduleOrderReminder(updated);
      if (result.status === "permission-denied") {
        setActionMessage("已接单，但系统通知权限未开启，本地提醒未设置。");
      } else if (result.status === "unsupported") {
        setActionMessage("已接单，当前平台不支持本地提醒。");
      } else if (result.status === "scheduled") {
        setActionMessage("已接单，并按默认时间设置提醒。");
      }
      return updated;
    },
    onMutate: () => {
      setActionError(null);
      setActionMessage(null);
    },
    onSuccess: invalidateAfterAction,
    onError: () => setActionError("接单失败，请刷新后重试。")
  });
  const completeMutation = useMutation({
    mutationFn: completeOrder,
    onMutate: () => setActionError(null),
    onSuccess: invalidateAfterAction,
    onError: () => setActionError("完成任务失败，请刷新后重试。")
  });
  const cancelMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const order = await cancelOrder(orderId, { cancel_reason: "用户取消" });
      await cancelOrderReminder(orderId);
      return order;
    },
    onMutate: () => setActionError(null),
    onSuccess: invalidateAfterAction,
    onError: () => setActionError("取消失败，请刷新后重试。")
  });
  const reminderMutation = useMutation({
    mutationFn: async ({ order, reminder_time }: { order: CookingOrder; reminder_time: string | null }) => {
      const updated = await updateOrderReminder(order.id, { reminder_time });
      if (reminder_time) {
        const result = await scheduleOrderReminder(updated);
        if (result.status === "scheduled") {
          setActionMessage("提醒已设置。");
        } else if (result.status === "permission-denied") {
          setActionMessage("提醒时间已保存，但系统通知权限未开启。");
        } else if (result.status === "unsupported") {
          setActionMessage("提醒时间已保存，当前平台不支持本地提醒。");
        }
      } else {
        await cancelOrderReminder(order.id);
        setActionMessage("提醒已取消。");
      }
      return updated;
    },
    onMutate: () => {
      setActionError(null);
      setActionMessage(null);
    },
    onSuccess: invalidateAfterAction,
    onError: () => setActionError("提醒设置失败，请稍后重试。")
  });
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  function handleSetDefaultReminder(order: CookingOrder) {
    if (!settingsQuery.data?.notifications_enabled) {
      setActionError("通知已关闭，请先到设置里开启提醒。");
      return;
    }
    const reminderIso = computeReminderIso(order, settingsQuery.data.default_reminder_minutes);
    if (!reminderIso) {
      setActionError("这道菜缺少可用的未来时间，无法按默认时间提醒。");
      return;
    }
    reminderMutation.mutate({ order, reminder_time: reminderIso });
  }

  const orders = ordersQuery.data ?? [];
  const requestedOrders = orders.filter((order: CookingOrder) => order.is_requester);
  const assignedOrders = orders.filter((order: CookingOrder) => order.is_assignee && order.status !== "completed");
  const completedAssignedOrders = orders.filter((order: CookingOrder) => order.is_assignee && order.status === "completed");
  const visibleOrders = selectedSection === "assigned" ? assignedOrders : selectedSection === "completedAssigned" ? completedAssignedOrders : requestedOrders;
  const notifications = notificationsQuery.data ?? [];
  const unreadNotifications = notifications.filter((notification: AppNotification) => !notification.is_read);
  const mutationPending = acceptMutation.isPending || completeMutation.isPending || cancelMutation.isPending || reminderMutation.isPending;

  return (
    <AppScreen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.primaryColor }]}>今天谁下厨</Text>
          <Text style={[styles.title, { color: theme.textColor }]}>清单</Text>
          <Text style={{ color: theme.mutedTextColor }}>家里想吃什么，谁来做，一眼看清。</Text>
        </View>
        <Pressable onPress={() => ordersQuery.refetch()} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.textColor, fontWeight: "800" }}>刷新</Text>
        </Pressable>
      </View>

      <View style={[styles.notificationPanel, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>动态</Text>
            <Text style={{ color: theme.mutedTextColor }}>{unreadNotifications.length > 0 ? `有 ${unreadNotifications.length} 条新动态` : "暂无未读动态"}</Text>
          </View>
          {unreadNotifications.length > 0 ? (
            <Pressable disabled={markAllReadMutation.isPending} onPress={() => markAllReadMutation.mutate()} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
              <Text style={{ color: theme.textColor }}>全部已读</Text>
            </Pressable>
          ) : null}
        </View>
        {notificationsQuery.isLoading ? <ActivityIndicator /> : null}
        {unreadNotifications.slice(0, 3).map((notification: AppNotification) => (
          <Pressable key={notification.id} onPress={() => markReadMutation.mutate(notification.id)} style={styles.notificationItem}>
            <Text style={[styles.notificationTitle, { color: theme.textColor }]}>{notification.title}</Text>
            <Text style={{ color: theme.mutedTextColor }}>{notification.body}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.segmentRow}>
        <Pressable
          onPress={() => setSelectedSection("assigned")}
          style={[
            styles.segmentButton,
            { backgroundColor: selectedSection === "assigned" ? theme.primaryColor : theme.surfaceColor, borderColor: selectedSection === "assigned" ? theme.primaryColor : theme.borderColor }
          ]}
        >
          <Text style={{ color: selectedSection === "assigned" ? "white" : theme.textColor, fontWeight: "800" }}>我要做的菜</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedSection("completedAssigned")}
          style={[
            styles.segmentButton,
            { backgroundColor: selectedSection === "completedAssigned" ? theme.primaryColor : theme.surfaceColor, borderColor: selectedSection === "completedAssigned" ? theme.primaryColor : theme.borderColor }
          ]}
        >
          <Text style={{ color: selectedSection === "completedAssigned" ? "white" : theme.textColor, fontWeight: "800" }}>我做过的菜</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedSection("requested")}
          style={[
            styles.segmentButton,
            { backgroundColor: selectedSection === "requested" ? theme.primaryColor : theme.surfaceColor, borderColor: selectedSection === "requested" ? theme.primaryColor : theme.borderColor }
          ]}
        >
          <Text style={{ color: selectedSection === "requested" ? "white" : theme.textColor, fontWeight: "800" }}>我点的菜</Text>
        </Pressable>
      </View>

      {ordersQuery.isLoading ? <ActivityIndicator /> : null}
      {ordersQuery.isError ? <Text style={{ color: theme.textColor }}>清单加载失败，请稍后重试。</Text> : null}
      {actionError ? <Text style={{ color: "#DC2626" }}>{actionError}</Text> : null}
      {actionMessage ? <Text style={{ color: theme.primaryColor }}>{actionMessage}</Text> : null}
      {visibleOrders.length === 0 && !ordersQuery.isLoading ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          {preferences.emptyStateImageUri ? <Image resizeMode="cover" source={{ uri: preferences.emptyStateImageUri }} style={styles.emptyImage} /> : <Text style={styles.emptyEmoji}>🥗</Text>}
          <Text style={{ color: theme.mutedTextColor }}>
            {selectedSection === "assigned"
              ? "暂时没有分配给你的菜。"
              : selectedSection === "completedAssigned"
                ? "还没有完成过的菜。"
                : "还没有点菜。去家庭菜谱里点一道想吃的菜吧。"}
          </Text>
        </View>
      ) : null}
      {visibleOrders.map((order: CookingOrder) => (
        <OrderCard
          key={order.id}
          order={order}
          onAccept={() => acceptMutation.mutate(order)}
          onComplete={() => completeMutation.mutate(order.id)}
          onCancel={() => cancelMutation.mutate(order.id)}
          onSetDefaultReminder={() => handleSetDefaultReminder(order)}
          onCancelReminder={() => reminderMutation.mutate({ order, reminder_time: null })}
          pending={mutationPending}
        />
      ))}
    </AppScreen>
  );
}

function OrderCard({
  order,
  onAccept,
  onComplete,
  onCancel,
  onSetDefaultReminder,
  onCancelReminder,
  pending
}: {
  order: CookingOrder;
  onAccept: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onSetDefaultReminder: () => void;
  onCancelReminder: () => void;
  pending: boolean;
}) {
  const { theme } = useAppTheme();
  const imageUrl = imageUrlFromPublicUrl(order.recipe_image_snapshot_url);
  const isActive = order.status === "pending_acceptance" || order.status === "accepted";
  return (
    <View style={[styles.orderCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
      <View style={styles.orderSummary}>
        <View style={styles.orderText}>
          <View style={styles.headerRow}>
            <Text style={[styles.cardTitle, { color: theme.textColor }]}>{order.recipe_title_snapshot}</Text>
            <Text style={[styles.statusPill, { color: theme.primaryColor, borderColor: theme.primaryColor }]}>{statusLabels[order.status]}</Text>
          </View>
          <Text style={{ color: theme.mutedTextColor }}>点菜：{order.requester_nickname} · 做饭：{order.assignee_nickname}</Text>
          <Text style={{ color: theme.mutedTextColor }}>
            {mealSlotLabels[order.meal_slot]} · {order.scheduled_date}{order.scheduled_time ? ` ${order.scheduled_time.slice(0, 5)}` : ""}
          </Text>
          <Text style={{ color: theme.mutedTextColor }}>{reminderLabel(order.reminder_time)}</Text>
          {order.note ? <Text style={{ color: theme.textColor }}>{order.note}</Text> : null}
          {order.cancel_reason ? <Text style={{ color: theme.mutedTextColor }}>取消原因：{order.cancel_reason}</Text> : null}
        </View>
        {imageUrl ? <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.orderImage} /> : null}
      </View>
      <View style={styles.actionRow}>
        {order.is_assignee && order.status === "pending_acceptance" ? (
          <Pressable disabled={pending} onPress={onAccept} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.primaryButtonText}>接单</Text>
          </Pressable>
        ) : null}
        {order.is_assignee && order.status === "accepted" ? (
          <Pressable disabled={pending} onPress={onComplete} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.primaryButtonText}>完成</Text>
          </Pressable>
        ) : null}
        {isActive && !order.reminder_time ? (
          <Pressable disabled={pending} onPress={onSetDefaultReminder} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
            <Text style={{ color: theme.textColor }}>按默认时间提醒</Text>
          </Pressable>
        ) : null}
        {isActive && order.reminder_time ? (
          <Pressable disabled={pending} onPress={onCancelReminder} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
            <Text style={{ color: theme.textColor }}>取消提醒</Text>
          </Pressable>
        ) : null}
        {order.is_requester && isActive ? (
          <Pressable disabled={pending} onPress={onCancel} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
            <Text style={{ color: "#DC2626", fontWeight: "800" }}>取消</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 32, fontWeight: "900" },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  headerRow: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  notificationPanel: { borderRadius: 24, borderWidth: 1, gap: 10, padding: 14 },
  notificationItem: { gap: 3, paddingVertical: 4 },
  notificationTitle: { fontWeight: "900" },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, flexGrow: 1, paddingHorizontal: 10, paddingVertical: 10 },
  orderCard: { borderRadius: 24, borderWidth: 1, gap: 12, padding: 14 },
  orderSummary: { alignItems: "center", flexDirection: "row", gap: 12 },
  orderText: { flex: 1, gap: 8 },
  orderImage: { backgroundColor: "#ECFDF5", borderRadius: 18, height: 92, width: 96 },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: "900" },
  statusPill: { borderRadius: 999, borderWidth: 1, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 4 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: { alignItems: "center", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  primaryButtonText: { color: "white", fontWeight: "900" },
  secondaryButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  dangerButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  emptyCard: { alignItems: "center", borderRadius: 24, borderWidth: 1, gap: 8, padding: 18 },
  emptyImage: { borderRadius: 22, height: 120, width: 160 },
  emptyEmoji: { fontSize: 46 }
});
