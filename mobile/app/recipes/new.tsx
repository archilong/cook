import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { uploadImagePickerAsset } from "@/api/images";
import { createRecipe } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { emptyRecipeForm, recipeCreateFromForm, recipeFormSchema, RecipeFormValues } from "@/features/recipes/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function NewRecipeScreen() {
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecipeFormValues>(emptyRecipeForm());
  const [error, setError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: async (recipe) => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      router.replace(`/recipes/${recipe.id}`);
    }
  });

  function updateStep(index: number, value: string): void {
    setForm((current) => ({
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
      setForm((current) => ({ ...current, main_image_id: uploaded.id }));
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
    createMutation.mutate(recipeCreateFromForm(parsed.data));
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>新建菜谱</Text>
      <TextInput
        placeholder="菜谱名称"
        value={form.title}
        onChangeText={(title) => setForm((current) => ({ ...current, title }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="作者"
        value={form.creator_name}
        onChangeText={(creator_name) => setForm((current) => ({ ...current, creator_name }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="简介"
        value={form.description}
        onChangeText={(description) => setForm((current) => ({ ...current, description }))}
        multiline
        style={[styles.input, styles.multiline, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="标签，用英文逗号分隔"
        value={form.tags_text}
        onChangeText={(tags_text) => setForm((current) => ({ ...current, tags_text }))}
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
          onPress={() => setForm((current) => ({ ...current, steps: [...current.steps, ""] }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>添加步骤</Text>
        </Pressable>
        <Pressable
          onPress={() => setForm((current) => ({ ...current, steps: current.steps.length > 1 ? current.steps.slice(0, -1) : current.steps }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>删除末尾步骤</Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {createMutation.isError ? <Text style={{ color: "#DC2626" }}>保存失败，请稍后重试。</Text> : null}
      <Pressable disabled={createMutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{createMutation.isPending ? "保存中..." : "保存菜谱"}</Text>
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
