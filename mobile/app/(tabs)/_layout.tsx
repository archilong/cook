import { Redirect, Tabs } from "expo-router";
import { Image, Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

function TabIcon({ color, fallback, uri }: { color: string; fallback: string; uri: string | null }) {
  if (uri) {
    return <Image resizeMode="cover" source={{ uri }} style={{ borderRadius: 8, height: 24, width: 24 }} />;
  }

  return <Text style={{ color, fontSize: 20 }}>{fallback}</Text>;
}

export default function TabsLayout() {
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const { status, user } = useAuthStore();

  if (status === "idle" || status === "loading") {
    return (
      <AppScreen>
        <Text>正在检查登录状态...</Text>
      </AppScreen>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: theme.mutedTextColor,
        tabBarStyle: {
          backgroundColor: theme.surfaceColor,
          borderTopColor: theme.borderColor,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6
        }
      }}
    >
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} fallback="🍳" uri={preferences.tabRecipesIconUri} />,
          title: "菜谱"
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} fallback="🏡" uri={preferences.tabFamilyIconUri} />,
          title: "家庭"
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} fallback="🥗" uri={preferences.tabTasksIconUri} />,
          title: "清单"
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} fallback="🌿" uri={preferences.tabSettingsIconUri} />,
          title: "设置"
        }}
      />
    </Tabs>
  );
}
