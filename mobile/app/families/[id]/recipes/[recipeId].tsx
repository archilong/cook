import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { listFamilyMembers, listFamilyRecipes } from "@/api/families";
import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { createFamilyOrder } from "@/api/orders";
import { AppScreen } from "@/components/AppScreen";
import { FamilyMember, FamilyRecipe } from "@/features/families/types";
import { MealSlot } from "@/features/orders/types";
import { RecipeStepRead } from "@/features/recipes/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parsePositiveId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function todayText(): string {
  return new Date().toISOString().slice(0, 10);
}

const mealSlots: { label: string; value: MealSlot }[] = [
  { label: "早餐", value: "breakfast" },
  { label: "上午茶", value: "morning_tea" },
  { label: "午餐", value: "lunch" },
  { label: "下午茶", value: "afternoon_tea" },
  { label: "晚餐", value: "dinner" },
  { label: "夜宵", value: "late_night_snack" }
];

export default function FamilyRecipeDetailScreen() {
  const { id, recipeId } = useLocalSearchParams();
  const familyId = parsePositiveId(id);
  const parsedRecipeId = parsePositiveId(recipeId);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState<number | null>(null);
  const [mealSlot, setMealSlot] = useState<MealSlot>("dinner");
  const [scheduledDate, setScheduledDate] = useState(todayText());
  const [scheduledTime, setScheduledTime] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const recipesQuery = useQuery({
    queryKey: ["families", familyId, "recipes"],
    queryFn: () => listFamilyRecipes(familyId ?? 0),
    enabled: familyId !== null
  });
  const membersQuery = useQuery({
    queryKey: ["families", familyId, "members"],
    queryFn: () => listFamilyMembers(familyId ?? 0),
    enabled: familyId !== null && showOrderForm
  });
  const orderMutation = useMutation({
    mutationFn: () => {
      if (familyId === null || parsedRecipeId === null || assigneeUserId === null) {
        throw new Error("请选择做饭的人。");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
        throw new Error("日期格式应为 YYYY-MM-DD。");
      }
      const trimmedTime = scheduledTime.trim();
      if (trimmedTime && !/^\d{2}:\d{2}$/.test(trimmedTime)) {
        throw new Error("时间格式应为 HH:mm。");
      }
      return createFamilyOrder(familyId, {
        recipe_id: parsedRecipeId,
        assignee_user_id: assigneeUserId,
        meal_slot: mealSlot,
        scheduled_date: scheduledDate,
        scheduled_time: trimmedTime ? `${trimmedTime}:00` : null,
        note: note.trim() || null,
        reminder_time: null
      });
    },
    onMutate: () => {
      setFormError(null);
      setSuccessMessage(null);
    },
    onSuccess: async () => {
      setSuccessMessage("已加入清单，等对方接单。");
      setShowOrderForm(false);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "orders"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "点菜失败，请稍后重试。");
    }
  });
  const members = membersQuery.data ?? [];
  const selectedMember = members.find((member: FamilyMember) => member.user_id === assigneeUserId) ?? members[0] ?? null;

  useEffect(() => {
    if (assigneeUserId === null && selectedMember) {
      setAssigneeUserId(selectedMember.user_id);
    }
  }, [assigneeUserId, selectedMember]);

  if (familyId === null || parsedRecipeId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭菜谱 ID 无效。</Text></AppScreen>;
  }
  if (recipesQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }

  const familyRecipe = recipesQuery.data?.find((item: FamilyRecipe) => item.recipe_id === parsedRecipeId);
  if (recipesQuery.isError || !familyRecipe) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭菜谱不存在或加载失败。</Text></AppScreen>;
  }

  const recipe = familyRecipe.recipe;
  const imageUrl = imageUrlFromPublicUrl(recipe.main_image?.public_url);

  return (
    <AppScreen>
      {imageUrl ? <Image resizeMode="contain" source={{ uri: imageUrl }} style={styles.heroImage} /> : null}
      <Text style={[styles.title, { color: theme.textColor }]}>{recipe.title}</Text>
      <Text style={{ color: theme.mutedTextColor }}>作者：{recipe.creator_name}</Text>
      <Text style={{ color: theme.mutedTextColor }}>由 {familyRecipe.shared_by_nickname} 共享</Text>
      {recipe.description ? <Text style={{ color: theme.textColor }}>{recipe.description}</Text> : null}
      {recipe.tags.length > 0 ? <Text style={{ color: theme.mutedTextColor }}>{recipe.tags.join(" · ")}</Text> : null}

      <View style={[styles.orderPanel, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>点菜</Text>
            <Text style={{ color: theme.mutedTextColor }}>把这道菜加入清单，并指定谁来做。</Text>
          </View>
          <Pressable onPress={() => setShowOrderForm((value) => !value)} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.primaryButtonText}>{showOrderForm ? "收起" : "点这道菜"}</Text>
          </Pressable>
        </View>
        {successMessage ? <Text style={{ color: theme.primaryColor }}>{successMessage}</Text> : null}
        {showOrderForm ? (
          <View style={styles.form}>
            {membersQuery.isLoading ? <ActivityIndicator /> : null}
            <Text style={[styles.fieldLabel, { color: theme.textColor }]}>做饭的人</Text>
            <View style={styles.optionRow}>
              {members.map((member: FamilyMember) => (
                <Pressable
                  key={member.user_id}
                  onPress={() => setAssigneeUserId(member.user_id)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: member.user_id === selectedMember?.user_id ? theme.primaryColor : theme.backgroundColor,
                      borderColor: member.user_id === selectedMember?.user_id ? theme.primaryColor : theme.borderColor
                    }
                  ]}
                >
                  <Text style={{ color: member.user_id === selectedMember?.user_id ? "white" : theme.textColor }}>{member.nickname}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textColor }]}>餐次</Text>
            <View style={styles.optionRow}>
              {mealSlots.map((slot) => (
                <Pressable
                  key={slot.value}
                  onPress={() => setMealSlot(slot.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: slot.value === mealSlot ? theme.primaryColor : theme.backgroundColor,
                      borderColor: slot.value === mealSlot ? theme.primaryColor : theme.borderColor
                    }
                  ]}
                >
                  <Text style={{ color: slot.value === mealSlot ? "white" : theme.textColor }}>{slot.label}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              placeholder="日期 YYYY-MM-DD"
              value={scheduledDate}
              onChangeText={setScheduledDate}
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
            />
            <TextInput
              placeholder="时间 HH:mm，可不填"
              value={scheduledTime}
              onChangeText={setScheduledTime}
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
            />
            <TextInput
              multiline
              placeholder="想吃微辣、少油，或者给做饭的人留句话"
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.noteInput, { borderColor: theme.borderColor, color: theme.textColor }]}
            />
            {formError ? <Text style={{ color: "#DC2626" }}>{formError}</Text> : null}
            <Pressable disabled={orderMutation.isPending} onPress={() => orderMutation.mutate()} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
              <Text style={styles.primaryButtonText}>{orderMutation.isPending ? "提交中..." : "加入清单"}</Text>
            </Pressable>
          </View>
        ) : null}
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
  title: { fontSize: 26, fontWeight: "800" },
  heroImage: { aspectRatio: 4 / 3, backgroundColor: "#FFF7ED", borderRadius: 16, width: "100%" },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  orderPanel: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 14 },
  orderHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  form: { gap: 10 },
  fieldLabel: { fontWeight: "800" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  noteInput: { minHeight: 76, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" },
  stepCard: { borderRadius: 12, borderWidth: 1, gap: 6, padding: 14 },
  stepNumber: { fontWeight: "800" }
});
