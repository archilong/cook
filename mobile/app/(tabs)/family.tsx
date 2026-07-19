import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { listFamilies, listFamilyRecipes } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { Family, FamilyRecipe } from "@/features/families/types";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function FamilyScreen() {
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const familiesQuery = useQuery({ queryKey: ["families"], queryFn: listFamilies });
  const families = familiesQuery.data ?? [];
  const selectedFamily = families.find((family: Family) => family.id === selectedFamilyId) ?? families[0] ?? null;
  const recipesQuery = useQuery({
    queryKey: ["families", selectedFamily?.id, "recipes"],
    queryFn: () => listFamilyRecipes(selectedFamily?.id ?? 0),
    enabled: selectedFamily !== null
  });

  useEffect(() => {
    if (selectedFamilyId !== null || families.length === 0) {
      return;
    }
    setSelectedFamilyId(families[0].id);
  }, [families, selectedFamilyId]);

  return (
    <AppScreen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.primaryColor }]}>一起吃饭的人</Text>
          <Text style={[styles.title, { color: theme.textColor }]}>家庭</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/families/join")} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
            <Text style={{ color: theme.textColor, fontWeight: "800" }}>加入</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/families/new")} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.primaryButtonText}>创建</Text>
          </Pressable>
        </View>
      </View>

      {preferences.familyCoverImageUri ? <Image resizeMode="cover" source={{ uri: preferences.familyCoverImageUri }} style={styles.coverImage} /> : <View style={[styles.coverFallback, { backgroundColor: "#DDFBEA" }]}><Text style={styles.coverEmoji}>🥬</Text><Text style={[styles.coverText, { color: theme.textColor }]}>今天也在家好好吃饭</Text></View>}

      {familiesQuery.isLoading ? <ActivityIndicator /> : null}
      {familiesQuery.isError ? <Text style={{ color: theme.textColor }}>家庭加载失败，请稍后重试。</Text> : null}
      {families.length === 0 && !familiesQuery.isLoading ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          {preferences.emptyStateImageUri ? <Image resizeMode="cover" source={{ uri: preferences.emptyStateImageUri }} style={styles.emptyImage} /> : <Text style={styles.emptyEmoji}>🏡</Text>}
          <Text style={{ color: theme.mutedTextColor }}>创建或加入一个家庭，开始一起点菜。</Text>
        </View>
      ) : null}

      {families.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textColor }]}>我的家庭</Text>
          {families.map((family: Family) => {
            const isSelected = family.id === selectedFamily?.id;
            return (
              <Pressable
                key={family.id}
                onPress={() => setSelectedFamilyId(family.id)}
                style={[
                  styles.familyCard,
                  {
                    backgroundColor: isSelected ? theme.primaryColor : theme.surfaceColor,
                    borderColor: isSelected ? theme.primaryColor : theme.borderColor
                  }
                ]}
              >
                <View style={styles.familyCardHeader}>
                  <View style={[styles.familyAvatar, { backgroundColor: isSelected ? "rgba(255,255,255,0.24)" : "#ECFDF5" }]}>
                    {preferences.familyAvatarImageUri ? <Image resizeMode="cover" source={{ uri: preferences.familyAvatarImageUri }} style={styles.avatarImage} /> : <Text style={styles.avatarEmoji}>🍚</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: isSelected ? "white" : theme.textColor }]}>{family.name}</Text>
                    {family.description ? <Text style={{ color: isSelected ? "white" : theme.mutedTextColor }}>{family.description}</Text> : null}
                  </View>
                </View>
                <Text style={{ color: isSelected ? "white" : theme.mutedTextColor }}>
                  {family.role === "admin" ? "管理员" : "成员"} · {family.member_count} 位成员 · {family.recipe_count} 道菜谱
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}

      {selectedFamily ? (
        <>
          <View style={styles.currentFamilyHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{selectedFamily.name}的菜谱</Text>
              <Text style={{ color: theme.mutedTextColor }}>不用进入详情，直接浏览这个家庭共享的菜。</Text>
            </View>
            <Pressable onPress={() => router.push(`/families/${selectedFamily.id}`)} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
              <Text style={{ color: theme.textColor, fontWeight: "800" }}>管理</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={() => router.push(`/families/${selectedFamily.id}/share-recipe`)} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
              <Text style={styles.primaryButtonText}>共享我的菜谱</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/families/${selectedFamily.id}/members`)} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
              <Text style={{ color: theme.textColor, fontWeight: "800" }}>成员</Text>
            </Pressable>
          </View>

          {recipesQuery.isLoading ? <ActivityIndicator /> : null}
          {recipesQuery.isError ? <Text style={{ color: theme.textColor }}>家庭菜谱加载失败。</Text> : null}
          {recipesQuery.data?.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
              {preferences.emptyStateImageUri ? <Image resizeMode="cover" source={{ uri: preferences.emptyStateImageUri }} style={styles.emptyImage} /> : <Text style={styles.emptyEmoji}>🍱</Text>}
              <Text style={{ color: theme.mutedTextColor }}>还没有共享菜谱。</Text>
            </View>
          ) : null}
          {recipesQuery.data?.map((item: FamilyRecipe) => {
            const imageUrl = imageUrlFromPublicUrl(item.recipe.main_image?.public_url);
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/families/${selectedFamily.id}/recipes/${item.recipe_id}`)}
                style={[styles.recipeCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}
              >
                <View style={styles.recipeContent}>
                  <View style={styles.recipeText}>
                    <Text style={[styles.cardTitle, { color: theme.textColor }]}>{item.recipe.title}</Text>
                    <Text style={{ color: theme.mutedTextColor }}>作者：{item.recipe.creator_name}</Text>
                    <Text style={{ color: theme.mutedTextColor }}>由 {item.shared_by_nickname} 共享 · {item.recipe.steps.length} 个步骤</Text>
                  </View>
                  {imageUrl ? <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.recipeThumbnail} /> : null}
                </View>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", gap: 8 },
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 32, fontWeight: "900" },
  sectionTitle: { fontSize: 20, fontWeight: "900" },
  currentFamilyHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  primaryButtonText: { color: "white", fontWeight: "900" },
  secondaryButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  coverImage: { borderRadius: 28, height: 150, width: "100%" },
  coverFallback: { alignItems: "center", borderRadius: 28, flexDirection: "row", gap: 14, minHeight: 130, padding: 20 },
  coverEmoji: { fontSize: 50 },
  coverText: { flex: 1, fontSize: 22, fontWeight: "900" },
  familyCard: { borderRadius: 22, borderWidth: 1, gap: 10, padding: 16 },
  familyCardHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  familyAvatar: { alignItems: "center", borderRadius: 999, height: 54, justifyContent: "center", overflow: "hidden", width: 54 },
  avatarImage: { height: "100%", width: "100%" },
  avatarEmoji: { fontSize: 24 },
  recipeCard: { borderRadius: 22, borderWidth: 1, padding: 16 },
  recipeContent: { alignItems: "center", flexDirection: "row", gap: 12 },
  recipeText: { flex: 1, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "900" },
  recipeThumbnail: { backgroundColor: "#ECFDF5", borderRadius: 18, height: 84, width: 96 },
  emptyCard: { alignItems: "center", borderRadius: 24, borderWidth: 1, gap: 8, padding: 18 },
  emptyImage: { borderRadius: 22, height: 120, width: 160 },
  emptyEmoji: { fontSize: 46 }
});
