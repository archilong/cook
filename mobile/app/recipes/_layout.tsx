import { Redirect, Stack } from "expo-router";
import { Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";

export default function RecipesLayout() {
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

  return <Stack screenOptions={{ headerShown: true }} />;
}
