import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function AboutScreen() {
  const { theme } = useAppTheme();
  const version = Constants.expoConfig?.version ?? "0.1.0";
  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>关于</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.appName, { color: theme.textColor }]}>Cook Picture</Text>
        <Text style={{ color: theme.mutedTextColor }}>版本 {version}</Text>
        <Text style={{ color: theme.mutedTextColor }}>一个给家庭共享菜谱、点菜和安排做饭任务的 MVP 应用。</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>隐私与通知</Text>
        <Text style={{ color: theme.mutedTextColor }}>当前版本使用站内通知和设备本地提醒，不包含远程推送、不注册推送 token，也不会在你长期不打开应用时由服务器主动推送。</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>用户协议与隐私政策</Text>
        <Text style={{ color: theme.mutedTextColor }}>正式发布前会补充完整协议文档。当前版本用于 MVP 功能验证和家庭场景测试。</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  appName: { fontSize: 22, fontWeight: "900" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 }
});
