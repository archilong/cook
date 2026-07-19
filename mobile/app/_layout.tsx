import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { getMySettings } from "@/api/users";
import { AppearanceProvider } from "@/features/appearance/AppearanceProvider";
import { useAuthStore } from "@/features/auth/authStore";
import { ThemeProvider, useAppTheme } from "@/theme/ThemeProvider";

function SessionBootstrap() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return null;
}

function SettingsBootstrap() {
  const user = useAuthStore((state) => state.user);
  const { applySettingsTheme } = useAppTheme();
  const settingsQuery = useQuery({
    queryKey: ["my-settings"],
    queryFn: getMySettings,
    enabled: Boolean(user)
  });

  useEffect(() => {
    if (settingsQuery.data) {
      applySettingsTheme(settingsQuery.data);
    }
  }, [applySettingsTheme, settingsQuery.data]);

  return null;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppearanceProvider>
          <SessionBootstrap />
          <SettingsBootstrap />
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings/account" options={{ title: "账户" }} />
            <Stack.Screen name="settings/reminders" options={{ title: "提醒管理" }} />
            <Stack.Screen name="settings/theme" options={{ title: "主题" }} />
            <Stack.Screen name="settings/appearance" options={{ title: "外观" }} />
            <Stack.Screen name="settings/help" options={{ title: "帮助" }} />
            <Stack.Screen name="settings/feedback" options={{ title: "反馈" }} />
            <Stack.Screen name="settings/about" options={{ title: "关于" }} />
          </Stack>
        </AppearanceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
