import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function HelpScreen() {
  const { theme } = useAppTheme();
  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>帮助</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>家庭</Text>
        <Text style={{ color: theme.mutedTextColor }}>创建家庭后，把邀请码发给家人。家人加入后就能一起共享菜谱和点菜。</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>菜谱共享</Text>
        <Text style={{ color: theme.mutedTextColor }}>先在“菜谱”里创建自己的菜谱，再到家庭里点击“共享我的菜谱”，选择要共享的菜。</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>点菜与清单</Text>
        <Text style={{ color: theme.mutedTextColor }}>在家庭菜谱详情里点击“点这道菜”，指定做饭的人。对方会在“清单”的“我要做的菜”里接单和完成。</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>本地提醒</Text>
        <Text style={{ color: theme.mutedTextColor }}>本地提醒只在当前设备生效，需要允许系统通知。更换设备后，请重新打开任务并设置提醒。</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 }
});
