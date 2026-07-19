import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { AppearanceImageSlot } from "@/features/appearance/types";
import { useAppTheme } from "@/theme/ThemeProvider";

type AppearanceItem = {
  slot: AppearanceImageSlot;
  title: string;
  description: string;
  group: "space" | "identity" | "navigation" | "empty";
  preview: "wide" | "avatar" | "icon" | "illustration";
};

const items: AppearanceItem[] = [
  {
    slot: "globalBackgroundImageUri",
    title: "全局背景图",
    description: "给菜谱、家庭、清单和设置铺上一层自己的厨房底色。",
    group: "space",
    preview: "wide"
  },
  {
    slot: "familyCoverImageUri",
    title: "家庭空间封面",
    description: "显示在家庭首页，用来代表这个家的餐桌氛围。",
    group: "space",
    preview: "wide"
  },
  {
    slot: "personalAvatarImageUri",
    title: "个人头像",
    description: "在个人空间和设置页中显示，更像一本属于你的厨房手账。",
    group: "identity",
    preview: "avatar"
  },
  {
    slot: "familyAvatarImageUri",
    title: "家庭头像",
    description: "家庭卡片的小标识，适合放家人合照、餐桌或喜欢的食材。",
    group: "identity",
    preview: "avatar"
  },
  {
    slot: "tabRecipesIconUri",
    title: "菜谱 Tab 图标",
    description: "替换底部菜谱入口图标。",
    group: "navigation",
    preview: "icon"
  },
  {
    slot: "tabFamilyIconUri",
    title: "家庭 Tab 图标",
    description: "替换底部家庭入口图标。",
    group: "navigation",
    preview: "icon"
  },
  {
    slot: "tabTasksIconUri",
    title: "清单 Tab 图标",
    description: "替换底部清单入口图标。",
    group: "navigation",
    preview: "icon"
  },
  {
    slot: "tabSettingsIconUri",
    title: "设置 Tab 图标",
    description: "替换底部设置入口图标。",
    group: "navigation",
    preview: "icon"
  },
  {
    slot: "emptyStateImageUri",
    title: "空状态插画",
    description: "没有菜谱、没有家庭菜谱或没有清单时显示的温柔插画。",
    group: "empty",
    preview: "illustration"
  }
];

const groupTitles: Record<AppearanceItem["group"], string> = {
  space: "空间图片",
  identity: "头像图片",
  navigation: "底部图标",
  empty: "空状态"
};

const maxStoredImageBytes = 10 * 1024 * 1024;
const maxStoredImageSizeText = "10MB";

function getImageStorageSize(uri: string): number {
  if (Platform.OS !== "web") {
    return 0;
  }

  return new Blob([uri]).size;
}

function isStorageQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
}

export default function AppearanceSettingsScreen() {
  const { theme } = useAppTheme();
  const { preferences, resetImage, setImage } = useAppearance();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<AppearanceImageSlot | null>(null);

  async function handleChooseImage(item: AppearanceItem) {
    setError(null);
    setMessage(null);
    setBusySlot(item.slot);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("需要允许访问相册，才能选择自定义图片。");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: item.preview === "wide" ? [16, 9] : [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9
      });

      if (result.canceled) {
        return;
      }

      const uri = result.assets[0]?.uri;
      if (!uri) {
        setError("没有读取到图片，请重新选择。");
        return;
      }

      const imageStorageSize = getImageStorageSize(uri);
      if (imageStorageSize > maxStoredImageBytes) {
        setError(`这张图片太大，当前本地保存最多支持 ${maxStoredImageSizeText}。请换一张更小的图片。`);
        return;
      }

      await setImage(item.slot, uri);
      setMessage(`${item.title}已更新。`);
    } catch (caughtError) {
      if (isStorageQuotaError(caughtError)) {
        setError("浏览器本地存储空间不足，请先重置一些外观图片，或换一张更小的图片。");
        return;
      }

      setError("图片保存失败，请稍后重试。");
    } finally {
      setBusySlot(null);
    }
  }

  async function handleResetImage(item: AppearanceItem) {
    setError(null);
    setMessage(null);
    setBusySlot(item.slot);
    try {
      await resetImage(item.slot);
      setMessage(`${item.title}已恢复默认。`);
    } catch {
      setError("恢复默认失败，请稍后重试。");
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <AppScreen>
      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: theme.primaryColor }]}>让厨房像自己家</Text>
        <Text style={[styles.title, { color: theme.textColor }]}>外观</Text>
        <Text style={{ color: theme.mutedTextColor }}>每张图都可以预览、替换和恢复默认。装饰不会影响菜谱、点菜和提醒操作。</Text>
      </View>

      {message ? <Text style={[styles.feedback, { backgroundColor: "#DCFCE7", color: "#166534" }]}>{message}</Text> : null}
      {error ? <Text style={[styles.feedback, { backgroundColor: "#FEE2E2", color: "#B91C1C" }]}>{error}</Text> : null}

      {(Object.keys(groupTitles) as AppearanceItem["group"][]).map((group) => (
        <View key={group} style={styles.group}>
          <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{groupTitles[group]}</Text>
          {items.filter((item) => item.group === group).map((item) => (
            <AppearanceImageCard
              key={item.slot}
              busy={busySlot === item.slot}
              item={item}
              onChoose={() => handleChooseImage(item)}
              onReset={() => handleResetImage(item)}
              theme={theme}
              uri={preferences[item.slot]}
            />
          ))}
        </View>
      ))}
    </AppScreen>
  );
}

function AppearanceImageCard({
  busy,
  item,
  onChoose,
  onReset,
  theme,
  uri
}: {
  busy: boolean;
  item: AppearanceItem;
  onChoose: () => void;
  onReset: () => void;
  theme: ReturnType<typeof useAppTheme>["theme"];
  uri: string | null;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
      <View style={styles.cardBody}>
        <View style={[styles.preview, styles[item.preview], { backgroundColor: "#ECFDF5", borderColor: theme.borderColor }]}>
          {uri ? <Image resizeMode="cover" source={{ uri }} style={styles.previewImage} /> : <Text style={styles.previewEmoji}>{item.preview === "wide" ? "🍃" : item.preview === "illustration" ? "🍲" : "🥬"}</Text>}
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.itemTitle, { color: theme.textColor }]}>{item.title}</Text>
          <Text style={{ color: theme.mutedTextColor }}>{item.description}</Text>
          <Text style={{ color: uri ? theme.primaryColor : theme.mutedTextColor }}>{uri ? "正在使用自定义图片" : "当前使用默认样式"}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable disabled={busy} onPress={onChoose} style={[styles.primaryButton, { backgroundColor: theme.primaryColor, opacity: busy ? 0.7 : 1 }]}>
          <Text style={styles.primaryButtonText}>{busy ? "处理中..." : uri ? "更换" : "选择图片"}</Text>
        </Pressable>
        <Pressable disabled={busy || !uri} onPress={onReset} style={[styles.secondaryButton, { borderColor: theme.borderColor, opacity: busy || !uri ? 0.45 : 1 }]}>
          <Text style={{ color: theme.textColor, fontWeight: "800" }}>重置默认</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6 },
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: "900" },
  sectionTitle: { fontSize: 20, fontWeight: "900" },
  group: { gap: 10 },
  card: { borderRadius: 22, borderWidth: 1, gap: 14, padding: 14 },
  cardBody: { alignItems: "center", flexDirection: "row", gap: 14 },
  cardText: { flex: 1, gap: 5 },
  itemTitle: { fontSize: 17, fontWeight: "900" },
  preview: { alignItems: "center", borderWidth: 1, justifyContent: "center", overflow: "hidden" },
  wide: { borderRadius: 18, height: 72, width: 104 },
  avatar: { borderRadius: 999, height: 72, width: 72 },
  icon: { borderRadius: 20, height: 64, width: 64 },
  illustration: { borderRadius: 22, height: 78, width: 92 },
  previewImage: { height: "100%", width: "100%" },
  previewEmoji: { fontSize: 28 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryButton: { alignItems: "center", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  feedback: { borderRadius: 14, fontWeight: "800", padding: 12 }
});
