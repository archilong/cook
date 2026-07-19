import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import { joinFamily } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { joinFamilyFromForm, joinFamilySchema, JoinFamilyFormValues } from "@/features/families/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function JoinFamilyScreen() {
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<JoinFamilyFormValues>({ invite_code: "" });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: joinFamily,
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      router.replace(`/families/${family.id}`);
    }
  });

  function submit(): void {
    const parsed = joinFamilySchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查邀请码。");
      return;
    }
    setError(null);
    mutation.mutate(joinFamilyFromForm(parsed.data));
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>加入家庭</Text>
      <TextInput
        autoCapitalize="characters"
        placeholder="输入邀请码"
        value={form.invite_code}
        onChangeText={(invite_code) => setForm({ invite_code })}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {mutation.isError ? <Text style={{ color: "#DC2626" }}>加入失败，请确认邀请码是否正确。</Text> : null}
      <Pressable disabled={mutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{mutation.isPending ? "加入中..." : "加入家庭"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 14 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
