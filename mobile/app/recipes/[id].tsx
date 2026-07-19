import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { deleteRecipe, getRecipe } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { RecipeStepRead } from "@/features/recipes/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseRecipeId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const recipeId = parseRecipeId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const recipeQuery = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => getRecipe(recipeId ?? 0),
    enabled: recipeId !== null
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(recipeId ?? 0),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      router.replace("/(tabs)/recipes");
    }
  });

  if (recipeId === null) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>菜谱 ID 无效。</Text>
      </AppScreen>
    );
  }

  if (recipeQuery.isLoading) {
    return (
      <AppScreen>
        <ActivityIndicator />
      </AppScreen>
    );
  }

  if (recipeQuery.isError || !recipeQuery.data) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>菜谱不存在或加载失败。</Text>
      </AppScreen>
    );
  }

  const recipe = recipeQuery.data;
  const imageUrl = imageUrlFromPublicUrl(recipe.main_image?.public_url);

  return (
    <AppScreen>
      {imageUrl ? <Image resizeMode="contain" source={{ uri: imageUrl }} style={styles.heroImage} /> : null}
      <Text style={[styles.title, { color: theme.textColor }]}>{recipe.title}</Text>
      <Text style={{ color: theme.mutedTextColor }}>作者：{recipe.creator_name}</Text>
      {recipe.description ? <Text style={{ color: theme.textColor }}>{recipe.description}</Text> : null}
      {recipe.tags.length > 0 ? <Text style={{ color: theme.mutedTextColor }}>{recipe.tags.join(" · ")}</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={() => router.push(`/recipes/edit?id=${recipe.id}`)} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.textColor }}>编辑</Text>
        </Pressable>
        <Pressable
          disabled={deleteMutation.isPending}
          onPress={() => deleteMutation.mutate()}
          style={[styles.dangerButton, { borderColor: "#DC2626" }]}
        >
          <Text style={{ color: "#DC2626" }}>{deleteMutation.isPending ? "删除中..." : "删除"}</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>步骤</Text>
      {recipe.steps.map((step: RecipeStepRead) => (
        <View key={step.id} style={[styles.stepCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          <Text style={[styles.stepNumber, { color: theme.primaryColor }]}>步骤 {step.step_no}</Text>
          <Text style={{ color: theme.textColor }}>{step.instruction}</Text>
          {step.estimated_minutes !== null ? <Text style={{ color: theme.mutedTextColor }}>{step.estimated_minutes} 分钟</Text> : null}
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "800"
  },
  heroImage: {
    aspectRatio: 4 / 3,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    width: "100%"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  dangerButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  stepNumber: {
    fontWeight: "700"
  }
});
