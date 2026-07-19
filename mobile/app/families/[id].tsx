import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { getFamily, refreshInviteCode } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const familyQuery = useQuery({
    queryKey: ["families", familyId],
    queryFn: () => getFamily(familyId ?? 0),
    enabled: familyId !== null
  });
  const refreshMutation = useMutation({
    mutationFn: () => refreshInviteCode(familyId ?? 0),
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", family.id] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (familyQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (familyQuery.isError || !familyQuery.data) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭不存在或加载失败。</Text></AppScreen>;
  }

  const family = familyQuery.data;
  const isAdmin = family.role === "admin";

  return (
    <AppScreen>
      {preferences.familyCoverImageUri ? <Image resizeMode="cover" source={{ uri: preferences.familyCoverImageUri }} style={styles.coverImage} /> : null}
      <View style={styles.familyHeader}>
        <View style={styles.familyAvatar}>
          {preferences.familyAvatarImageUri ? <Image resizeMode="cover" source={{ uri: preferences.familyAvatarImageUri }} style={styles.avatarImage} /> : <Text style={styles.avatarEmoji}>🍚</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.primaryColor }]}>家庭空间</Text>
          <Text style={[styles.title, { color: theme.textColor }]}>{family.name}</Text>
          {family.description ? <Text style={{ color: theme.mutedTextColor }}>{family.description}</Text> : null}
        </View>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={{ color: theme.mutedTextColor }}>我的角色：{isAdmin ? "管理员" : "成员"}</Text>
        <Text style={{ color: theme.mutedTextColor }}>成员：{family.member_count} 位</Text>
        <Text style={{ color: theme.mutedTextColor }}>共享菜谱：{family.recipe_count} 道</Text>
        {isAdmin && family.invite_code ? <Text style={[styles.inviteCode, { color: theme.textColor }]}>邀请码：{family.invite_code}</Text> : null}
      </View>

      {isAdmin ? (
        <Pressable disabled={refreshMutation.isPending} onPress={() => refreshMutation.mutate()} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.textColor, fontWeight: "800" }}>{refreshMutation.isPending ? "刷新中..." : "刷新邀请码"}</Text>
        </Pressable>
      ) : null}
      {refreshMutation.isError ? <Text style={{ color: "#DC2626" }}>刷新邀请码失败。</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={() => router.push(`/families/${family.id}/members`)} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.textColor, fontWeight: "800" }}>成员</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/families/${family.id}/recipes`)} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.textColor, fontWeight: "800" }}>家庭菜谱</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/families/${family.id}/share-recipe`)} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
          <Text style={styles.primaryButtonText}>共享我的菜谱</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  coverImage: { borderRadius: 28, height: 150, width: "100%" },
  familyHeader: { alignItems: "center", flexDirection: "row", gap: 14 },
  familyAvatar: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 999, height: 72, justifyContent: "center", overflow: "hidden", width: 72 },
  avatarImage: { height: "100%", width: "100%" },
  avatarEmoji: { fontSize: 34 },
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: "900" },
  summaryCard: { borderRadius: 24, borderWidth: 1, gap: 8, padding: 16 },
  inviteCode: { fontSize: 18, fontWeight: "900" },
  actions: { gap: 10 },
  primaryButton: { alignItems: "center", borderRadius: 999, padding: 14 },
  primaryButtonText: { color: "white", fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, padding: 12 }
});
