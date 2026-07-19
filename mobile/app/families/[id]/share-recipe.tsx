import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listFamilyRecipes, shareRecipeToFamily } from "@/api/families";
import { listRecipes } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { FamilyRecipe } from "@/features/families/types";
import { RecipeRead } from "@/features/recipes/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ShareRecipeScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const myRecipesQuery = useQuery({ queryKey: ["recipes"], queryFn: listRecipes });
  const familyRecipesQuery = useQuery({ queryKey: ["families", familyId, "recipes"], queryFn: () => listFamilyRecipes(familyId ?? 0), enabled: familyId !== null });
  const shareMutation = useMutation({
    mutationFn: (recipeId: number) => shareRecipeToFamily(familyId ?? 0, recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "recipes"] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (myRecipesQuery.isLoading || familyRecipesQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (myRecipesQuery.isError || familyRecipesQuery.isError) {
    return <AppScreen><Text style={{ color: theme.textColor }}>菜谱加载失败。</Text></AppScreen>;
  }

  const sharedRecipeIds = new Set((familyRecipesQuery.data ?? []).map((item: FamilyRecipe) => item.recipe_id));

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>共享我的菜谱</Text>
      {myRecipesQuery.data?.length === 0 ? <Text style={{ color: theme.mutedTextColor }}>你还没有可以共享的菜谱。</Text> : null}
      {myRecipesQuery.data?.map((recipe: RecipeRead) => {
        const isShared = sharedRecipeIds.has(recipe.id);
        return (
          <View key={recipe.id} style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <Text style={[styles.recipeTitle, { color: theme.textColor }]}>{recipe.title}</Text>
            <Text style={{ color: theme.mutedTextColor }}>{recipe.steps.length} 个步骤</Text>
            <Pressable
              disabled={isShared || shareMutation.isPending}
              onPress={() => shareMutation.mutate(recipe.id)}
              style={[styles.primaryButton, { backgroundColor: isShared ? theme.borderColor : theme.primaryColor }]}
            >
              <Text style={styles.primaryButtonText}>{isShared ? "已共享" : "共享到家庭"}</Text>
            </Pressable>
          </View>
        );
      })}
      {shareMutation.isError ? <Text style={{ color: "#DC2626" }}>共享失败，请稍后重试。</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  recipeTitle: { fontSize: 18, fontWeight: "800" },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 12 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
