import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { getHealth } from "@/api/health";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

type SettingsEntry = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

const entries: SettingsEntry[] = [
  { title: "账户", description: "昵称、密码和登录信息", href: "/settings/account", icon: "👤" },
  { title: "提醒管理", description: "通知开关和默认提醒时间", href: "/settings/reminders", icon: "⏰" },
  { title: "主题", description: "深浅色模式和主题色", href: "/settings/theme", icon: "🎨" },
  { title: "外观", description: "背景、封面、头像、Tab 图标和空状态插画", href: "/settings/appearance", icon: "🌿" },
  { title: "帮助", description: "查看使用说明", href: "/settings/help", icon: "📖" },
  { title: "反馈", description: "发送问题和建议", href: "/settings/feedback", icon: "💌" },
  { title: "关于", description: "版本和隐私说明", href: "/settings/about", icon: "🥣" }
];

export default function SettingsScreen() {
  const { preferences } = useAppearance();
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();
  const { theme } = useAppTheme();

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false
  });

  async function handleLogout() {
    await logout();
    queryClient.clear();
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <View style={[styles.profileCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <View style={styles.avatar}>
          {preferences.personalAvatarImageUri ? <Image resizeMode="cover" source={{ uri: preferences.personalAvatarImageUri }} style={styles.avatarImage} /> : <Text style={styles.avatarEmoji}>🍳</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.primaryColor }]}>我的厨房</Text>
          <Text style={[styles.title, { color: theme.textColor }]}>{user.nickname}</Text>
          <Text style={{ color: theme.mutedTextColor }}>{user.email ?? user.phone}</Text>
          <Text style={{ color: healthQuery.error ? "#B91C1C" : theme.mutedTextColor }}>API 状态：{healthQuery.data?.status ?? (healthQuery.error ? "未连接" : "检查中")}</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        {entries.map((entry) => (
          <Pressable key={entry.href} onPress={() => router.push(entry.href as never)} style={[styles.menuItem, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <Text style={styles.menuIcon}>{entry.icon}</Text>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: theme.textColor }]}>{entry.title}</Text>
              <Text style={{ color: theme.mutedTextColor }}>{entry.description}</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.mutedTextColor }]}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={handleLogout} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
        <Text style={{ color: "#DC2626", fontWeight: "900" }}>退出登录</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: "center", borderRadius: 26, borderWidth: 1, flexDirection: "row", gap: 14, padding: 16 },
  avatar: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 999, height: 72, justifyContent: "center", overflow: "hidden", width: 72 },
  avatarImage: { height: "100%", width: "100%" },
  avatarEmoji: { fontSize: 34 },
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "900" },
  menuGrid: { gap: 10 },
  menuItem: { alignItems: "center", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 14 },
  menuIcon: { fontSize: 24, width: 30 },
  menuText: { flex: 1, gap: 4 },
  menuTitle: { fontSize: 16, fontWeight: "900" },
  chevron: { fontSize: 28, lineHeight: 28 },
  dangerButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, padding: 12 }
});
