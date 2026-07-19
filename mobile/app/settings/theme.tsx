import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getMySettings, updateMySettings } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { ThemeMode } from "@/theme/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

const primaryColorPresets = ["#F97316", "#22C55E", "#3B82F6", "#EC4899"];

export default function ThemeSettingsScreen() {
  const queryClient = useQueryClient();
  const { status, user } = useAuthStore();
  const { applySettingsTheme, theme } = useAppTheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [primaryColor, setPrimaryColor] = useState("#F97316");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({ queryKey: ["my-settings"], queryFn: getMySettings, enabled: Boolean(user) });

  useEffect(() => {
    if (settingsQuery.data) {
      setThemeMode(settingsQuery.data.theme_mode);
      setPrimaryColor(settingsQuery.data.primary_color);
    }
  }, [settingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
        throw new Error("主题色需要是 #RRGGBB 格式。");
      }
      return updateMySettings({ theme_mode: themeMode, primary_color: primaryColor });
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (settings) => {
      applySettingsTheme(settings);
      setMessage("主题设置已保存。");
      await queryClient.invalidateQueries({ queryKey: ["my-settings"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "保存主题设置失败，请稍后重试。");
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
      <Text style={[styles.title, { color: theme.textColor }]}>主题</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>主题模式</Text>
        <View style={styles.optionRow}>
          {(["light", "dark"] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={[
                styles.chip,
                {
                  backgroundColor: themeMode === mode ? theme.primaryColor : theme.backgroundColor,
                  borderColor: themeMode === mode ? theme.primaryColor : theme.borderColor
                }
              ]}
            >
              <Text style={{ color: themeMode === mode ? "white" : theme.textColor }}>{mode === "light" ? "浅色" : "深色"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>主题色</Text>
        <View style={styles.optionRow}>
          {primaryColorPresets.map((color) => (
            <Pressable key={color} onPress={() => setPrimaryColor(color)} style={[styles.colorChip, { backgroundColor: color, borderColor: primaryColor === color ? theme.textColor : color }]}>
              <Text style={styles.colorChipText}>{primaryColor === color ? "✓" : ""}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          placeholder="#F97316"
          value={primaryColor}
          onChangeText={setPrimaryColor}
          autoCapitalize="characters"
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
      </View>
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {message ? <Text style={{ color: theme.primaryColor }}>{message}</Text> : null}
      <Pressable disabled={updateSettingsMutation.isPending} onPress={() => updateSettingsMutation.mutate()} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{updateSettingsMutation.isPending ? "保存中..." : "保存主题"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  colorChip: { alignItems: "center", borderRadius: 999, borderWidth: 2, height: 34, justifyContent: "center", width: 34 },
  colorChipText: { color: "white", fontWeight: "900" },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
