import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { submitFeedback } from "@/api/feedback";
import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function FeedbackScreen() {
  const { theme } = useAppTheme();
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const feedbackMutation = useMutation({
    mutationFn: () => submitFeedback({ content: content.trim() }),
    onMutate: () => {
      setMessage(null);
      setError(null);
    },
    onSuccess: () => {
      setContent("");
      setMessage("反馈已发送，感谢你的建议。");
    },
    onError: () => {
      setError("发送失败，请稍后重试。");
    }
  });

  const canSubmit = content.trim().length > 0 && !feedbackMutation.isPending;

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>反馈</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>告诉我们你的想法</Text>
        <Text style={{ color: theme.mutedTextColor }}>可以写下问题、建议或你希望增加的功能。提交后会发送到反馈邮箱。</Text>
        <TextInput
          multiline
          placeholder="输入反馈内容"
          value={content}
          onChangeText={setContent}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        <Pressable
          disabled={!canSubmit}
          onPress={() => feedbackMutation.mutate()}
          style={[styles.primaryButton, { backgroundColor: canSubmit ? theme.primaryColor : theme.borderColor }]}
        >
          <Text style={styles.primaryButtonText}>{feedbackMutation.isPending ? "发送中..." : "发送反馈"}</Text>
        </Pressable>
        {message ? <Text style={{ color: theme.primaryColor }}>{message}</Text> : null}
        {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 10, borderWidth: 1, minHeight: 120, padding: 12, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
