import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { getFamily, listFamilyRecipes, removeFamilyRecipe } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { FamilyRecipe } from "@/features/families/types";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function FamilyRecipesScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const familyQuery = useQuery({ queryKey: ["families", familyId], queryFn: () => getFamily(familyId ?? 0), enabled: familyId !== null });
  const recipesQuery = useQuery({ queryKey: ["families", familyId, "recipes"], queryFn: () => listFamilyRecipes(familyId ?? 0), enabled: familyId !== null });
  const removeMutation = useMutation({
    mutationFn: (recipeId: number) => removeFamilyRecipe(familyId ?? 0, recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "recipes"] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (familyQuery.isLoading || recipesQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (familyQuery.isError || recipesQuery.isError || !familyQuery.data) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭菜谱加载失败。</Text></AppScreen>;
  }

  const isAdmin = familyQuery.data.role === "admin";
  const currentUserId = currentUser?.id ?? null;

  return (
    <AppScreen>
      <Text style={[styles.kicker, { color: theme.primaryColor }]}>共享菜谱</Text>
      <Text style={[styles.title, { color: theme.textColor }]}>家庭菜谱</Text>
      {recipesQuery.data?.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          {preferences.emptyStateImageUri ? <Image resizeMode="cover" source={{ uri: preferences.emptyStateImageUri }} style={styles.emptyImage} /> : <Text style={styles.emptyEmoji}>🍱</Text>}
          <Text style={{ color: theme.mutedTextColor }}>还没有共享菜谱。</Text>
        </View>
      ) : null}
      {recipesQuery.data?.map((item: FamilyRecipe) => {
        const imageUrl = imageUrlFromPublicUrl(item.recipe.main_image?.public_url);
        const canRemove = isAdmin || item.shared_by_user_id === currentUserId;
        return (
          <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <Pressable onPress={() => router.push(`/families/${familyId}/recipes/${item.recipe_id}`)} style={styles.recipeSummary}>
              <View style={styles.recipeText}>
                <Text style={[styles.recipeTitle, { color: theme.textColor }]}>{item.recipe.title}</Text>
                <Text style={{ color: theme.mutedTextColor }}>作者：{item.recipe.creator_name}</Text>
                <Text style={{ color: theme.mutedTextColor }}>由 {item.shared_by_nickname} 共享 · {item.recipe.steps.length} 个步骤</Text>
              </View>
              {imageUrl ? <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.recipeThumbnail} /> : null}
            </Pressable>
            {canRemove ? (
              <Pressable disabled={removeMutation.isPending} onPress={() => removeMutation.mutate(item.recipe_id)} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
                <Text style={{ color: "#DC2626", fontWeight: "800" }}>移除共享</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {removeMutation.isError ? <Text style={{ color: "#DC2626" }}>移除共享失败。</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: "900" },
  card: { borderRadius: 22, borderWidth: 1, gap: 10, padding: 16 },
  recipeSummary: { alignItems: "center", flexDirection: "row", gap: 12 },
  recipeText: { flex: 1, gap: 8 },
  recipeThumbnail: { backgroundColor: "#ECFDF5", borderRadius: 18, height: 84, width: 96 },
  recipeTitle: { fontSize: 18, fontWeight: "900" },
  dangerButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, padding: 10 },
  emptyCard: { alignItems: "center", borderRadius: 24, borderWidth: 1, gap: 8, padding: 18 },
  emptyImage: { borderRadius: 22, height: 120, width: 160 },
  emptyEmoji: { fontSize: 46 }
});
