import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import { createFamily } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { emptyFamilyForm, familyCreateFromForm, familyFormSchema, FamilyFormValues } from "@/features/families/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function NewFamilyScreen() {
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FamilyFormValues>(emptyFamilyForm());
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: createFamily,
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      router.replace(`/families/${family.id}`);
    }
  });

  function submit(): void {
    const parsed = familyFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查家庭信息。");
      return;
    }
    setError(null);
    mutation.mutate(familyCreateFromForm(parsed.data));
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>创建家庭</Text>
      <TextInput
        placeholder="家庭名称"
        value={form.name}
        onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="简介，可选"
        value={form.description}
        onChangeText={(description) => setForm((current) => ({ ...current, description }))}
        multiline
        style={[styles.input, styles.multiline, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {mutation.isError ? <Text style={{ color: "#DC2626" }}>创建失败，请稍后重试。</Text> : null}
      <Pressable disabled={mutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{mutation.isPending ? "创建中..." : "创建家庭"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 14 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
