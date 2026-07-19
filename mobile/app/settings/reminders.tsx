import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getMySettings, updateMySettings } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function ReminderSettingsScreen() {
  const queryClient = useQueryClient();
  const { status, user } = useAuthStore();
  const { theme } = useAppTheme();
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState("30");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({ queryKey: ["my-settings"], queryFn: getMySettings, enabled: Boolean(user) });

  useEffect(() => {
    if (settingsQuery.data) {
      setDefaultReminderMinutes(String(settingsQuery.data.default_reminder_minutes));
      setNotificationsEnabled(settingsQuery.data.notifications_enabled);
    }
  }, [settingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      const parsedMinutes = Number(defaultReminderMinutes);
      if (!Number.isInteger(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 1440) {
        throw new Error("默认提醒时间需为 0 到 1440 之间的整数。");
      }
      return updateMySettings({ default_reminder_minutes: parsedMinutes, notifications_enabled: notificationsEnabled });
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async () => {
      setMessage("提醒设置已保存。");
      await queryClient.invalidateQueries({ queryKey: ["my-settings"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "保存提醒设置失败，请稍后重试。");
    }
  });

  if (status === "idle" || status === "loading") {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>正在检查登录状态...</Text>
      </AppScreen>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>提醒管理</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <View style={styles.rowBetween}>
          <Text style={{ color: theme.textColor }}>本地提醒和站内通知</Text>
          <Pressable
            onPress={() => setNotificationsEnabled((value) => !value)}
            style={[
              styles.chip,
              {
                backgroundColor: notificationsEnabled ? theme.primaryColor : theme.backgroundColor,
                borderColor: notificationsEnabled ? theme.primaryColor : theme.borderColor
              }
            ]}
          >
            <Text style={{ color: notificationsEnabled ? "white" : theme.textColor }}>{notificationsEnabled ? "已开启" : "已关闭"}</Text>
          </Pressable>
        </View>
        <TextInput
          keyboardType="number-pad"
          placeholder="默认提前提醒分钟数"
          value={defaultReminderMinutes}
          onChangeText={setDefaultReminderMinutes}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        <View style={styles.optionRow}>
          {[15, 30, 60].map((minutes) => (
            <Pressable key={minutes} onPress={() => setDefaultReminderMinutes(String(minutes))} style={[styles.chip, { borderColor: theme.borderColor }]}>
              <Text style={{ color: theme.textColor }}>提前 {minutes} 分钟</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {message ? <Text style={{ color: theme.primaryColor }}>{message}</Text> : null}
      <Pressable disabled={updateSettingsMutation.isPending} onPress={() => updateSettingsMutation.mutate()} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{updateSettingsMutation.isPending ? "保存中..." : "保存提醒设置"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
