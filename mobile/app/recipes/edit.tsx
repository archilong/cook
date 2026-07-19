import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { uploadImagePickerAsset } from "@/api/images";
import { getRecipe, updateRecipe } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { emptyRecipeForm, recipeCreateFromForm, recipeFormSchema, RecipeFormValues } from "@/features/recipes/schemas";
import { RecipeCreate, RecipeStepRead } from "@/features/recipes/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseRecipeId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams();
  const recipeId = parseRecipeId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecipeFormValues>(emptyRecipeForm());
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [initializedRecipeId, setInitializedRecipeId] = useState<number | null>(null);
  const recipeQuery = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => getRecipe(recipeId ?? 0),
    enabled: recipeId !== null
  });
  const updateMutation = useMutation({
    mutationFn: (values: RecipeFormValues) => updateRecipe(recipeId ?? 0, recipeUpdateFromForm(values)),
    onSuccess: async (recipe) => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["recipes", recipe.id] });
      router.replace(`/recipes/${recipe.id}`);
    }
  });

  useEffect(() => {
    if (!recipeQuery.data || initializedRecipeId === recipeQuery.data.id || (isDirty && initializedRecipeId !== null)) {
      return;
    }
    setForm({
      title: recipeQuery.data.title,
      creator_name: recipeQuery.data.creator_name,
      description: recipeQuery.data.description ?? "",
      tags_text: recipeQuery.data.tags.join(", "),
      main_image_id: recipeQuery.data.main_image_id,
      steps: recipeQuery.data.steps.map((step: RecipeStepRead) => step.instruction)
    });
    setIsDirty(false);
    setInitializedRecipeId(recipeQuery.data.id);
  }, [initializedRecipeId, isDirty, recipeQuery.data]);

  function updateForm(updater: (current: RecipeFormValues) => RecipeFormValues): void {
    setIsDirty(true);
    setForm(updater);
  }

  function recipeUpdateFromForm(values: RecipeFormValues): RecipeCreate {
    const request = recipeCreateFromForm(values);
    const existingSteps = recipeQuery.data?.steps ?? [];
    return {
      ...request,
      steps: request.steps.map((step, index) => {
        const existingStep = existingSteps[index];
        return {
          ...step,
          image_id: existingStep?.image_id ?? null,
          estimated_minutes: existingStep?.estimated_minutes ?? null
        };
      })
    };
  }

  function updateStep(index: number, value: string): void {
    updateForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? value : step))
    }));
  }

  async function pickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("需要相册权限才能上传图片。");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled) {
      return;
    }
    try {
      setError(null);
      const uploaded = await uploadImagePickerAsset(result.assets[0], "recipe_main");
      updateForm((current) => ({ ...current, main_image_id: uploaded.id }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败，请稍后重试。");
    }
  }

  function submit(): void {
    const parsed = recipeFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查菜谱内容。");
      return;
    }
    setError(null);
    updateMutation.mutate(parsed.data);
  }

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

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>编辑菜谱</Text>
      <TextInput
        placeholder="菜谱名称"
        value={form.title}
        onChangeText={(title) => updateForm((current) => ({ ...current, title }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="作者"
        value={form.creator_name}
        onChangeText={(creator_name) => updateForm((current) => ({ ...current, creator_name }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="简介"
        value={form.description}
        onChangeText={(description) => updateForm((current) => ({ ...current, description }))}
        multiline
        style={[styles.input, styles.multiline, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="标签，用英文逗号分隔"
        value={form.tags_text}
        onChangeText={(tags_text) => updateForm((current) => ({ ...current, tags_text }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <Pressable onPress={pickImage} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
        <Text style={{ color: theme.textColor }}>{form.main_image_id ? "已上传主图，重新选择" : "选择主图"}</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>步骤</Text>
      {form.steps.map((step, index) => (
        <TextInput
          key={index}
          placeholder={`步骤 ${index + 1}`}
          value={step}
          onChangeText={(value) => updateStep(index, value)}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
      ))}
      <View style={styles.actions}>
        <Pressable
          onPress={() => updateForm((current) => ({ ...current, steps: [...current.steps, ""] }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>添加步骤</Text>
        </Pressable>
        <Pressable
          onPress={() => updateForm((current) => ({ ...current, steps: current.steps.length > 1 ? current.steps.slice(0, -1) : current.steps }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>删除末尾步骤</Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {updateMutation.isError ? <Text style={{ color: "#DC2626" }}>保存失败，请稍后重试。</Text> : null}
      <Pressable disabled={updateMutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{updateMutation.isPending ? "保存中..." : "保存修改"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "800"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 10,
    padding: 14
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "800"
  }
});
