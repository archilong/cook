import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { listRecipes } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { RecipeRead } from "@/features/recipes/types";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function RecipesScreen() {
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const recipesQuery = useQuery({ queryKey: ["recipes"], queryFn: listRecipes });

  return (
    <AppScreen>
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.primaryColor }]}>今日厨房手账</Text>
          <Text style={[styles.title, { color: theme.textColor }]}>菜谱</Text>
          <Text style={{ color: theme.mutedTextColor }}>把常做的味道收好，下一餐不用重新想。</Text>
        </View>
        <Pressable onPress={() => router.push("/recipes/new")} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
          <Text style={styles.primaryButtonText}>新建</Text>
        </Pressable>
      </View>

      {recipesQuery.isLoading ? <ActivityIndicator /> : null}
      {recipesQuery.isError ? <Text style={{ color: theme.textColor }}>菜谱加载失败，请稍后重试。</Text> : null}
      {recipesQuery.data?.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          {preferences.emptyStateImageUri ? <Image resizeMode="cover" source={{ uri: preferences.emptyStateImageUri }} style={styles.emptyImage} /> : <Text style={styles.emptyEmoji}>🍲</Text>}
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>还没有菜谱</Text>
          <Text style={{ color: theme.mutedTextColor }}>点击新建，记录第一道属于家的味道。</Text>
        </View>
      ) : null}
      {recipesQuery.data?.map((recipe: RecipeRead) => {
        const imageUrl = imageUrlFromPublicUrl(recipe.main_image?.public_url);
        return (
          <Pressable
            key={recipe.id}
            onPress={() => router.push(`/recipes/${recipe.id}`)}
            style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: theme.textColor }]}>{recipe.title}</Text>
                <Text style={{ color: theme.mutedTextColor }}>作者：{recipe.creator_name}</Text>
                <Text style={{ color: theme.mutedTextColor }}>{recipe.steps.length} 个步骤</Text>
                {recipe.tags.length > 0 ? <Text style={{ color: theme.mutedTextColor }}>{recipe.tags.join(" · ")}</Text> : null}
              </View>
              {imageUrl ? <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.cardThumbnail} /> : null}
            </View>
          </Pressable>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between"
  },
  kicker: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  title: {
    fontSize: 32,
    fontWeight: "900"
  },
  primaryButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "900"
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16
  },
  cardContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  cardText: {
    flex: 1,
    gap: 6
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  cardThumbnail: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    height: 84,
    width: 96
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20
  },
  emptyImage: {
    borderRadius: 24,
    height: 132,
    width: 176
  },
  emptyEmoji: {
    fontSize: 52
  }
});
