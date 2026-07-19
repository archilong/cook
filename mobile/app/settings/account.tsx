import { useMutation } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { updateMe, updateMyPassword } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function AccountSettingsScreen() {
  const { preferences } = useAppearance();
  const { setUser, status, user } = useAuthStore();
  const { theme } = useAppTheme();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: () => {
      const trimmedNickname = nickname.trim();
      if (!trimmedNickname) {
        throw new Error("请输入昵称。");
      }
      return updateMe({ nickname: trimmedNickname });
    },
    onMutate: () => {
      setProfileError(null);
      setProfileMessage(null);
    },
    onSuccess: (updatedUser) => {
      setNickname(updatedUser.nickname);
      setUser(updatedUser);
      setProfileMessage("昵称已保存。");
    },
    onError: (error) => {
      setProfileError(error instanceof Error ? error.message : "保存昵称失败，请稍后重试。");
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: () => {
      if (!currentPassword) {
        throw new Error("请输入当前密码。");
      }
      if (newPassword.length < 6 || newPassword.length > 128) {
        throw new Error("新密码需为 6 到 128 位。");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("两次输入的新密码不一致。");
      }
      return updateMyPassword({ current_password: currentPassword, new_password: newPassword });
    },
    onMutate: () => {
      setPasswordError(null);
      setPasswordMessage(null);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("密码已修改。");
    },
    onError: (error) => {
      setPasswordError(error instanceof Error ? error.message : "修改密码失败，请稍后重试。");
    }
  });

  if (status === "idle" || status === "loading") {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>正在检查登录状态...</Text>
      </AppScreen>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {preferences.personalAvatarImageUri ? <Image resizeMode="cover" source={{ uri: preferences.personalAvatarImageUri }} style={styles.avatarImage} /> : <Text style={styles.avatarEmoji}>🍳</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.primaryColor }]}>账户资料</Text>
          <Text style={[styles.title, { color: theme.textColor }]}>账户</Text>
          <Text style={{ color: theme.mutedTextColor }}>当前用户：{user.email ?? user.phone}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>昵称</Text>
        <TextInput
          placeholder="昵称"
          value={nickname}
          onChangeText={setNickname}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        {profileError ? <Text style={{ color: "#DC2626" }}>{profileError}</Text> : null}
        {profileMessage ? <Text style={{ color: theme.primaryColor }}>{profileMessage}</Text> : null}
        <Pressable
          disabled={updateProfileMutation.isPending}
          onPress={() => updateProfileMutation.mutate()}
          style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}
        >
          <Text style={styles.primaryButtonText}>{updateProfileMutation.isPending ? "保存中..." : "保存昵称"}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>修改密码</Text>
        <TextInput
          placeholder="当前密码"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        <TextInput
          placeholder="新密码"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        <TextInput
          placeholder="再次输入新密码"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        {passwordError ? <Text style={{ color: "#DC2626" }}>{passwordError}</Text> : null}
        {passwordMessage ? <Text style={{ color: theme.primaryColor }}>{passwordMessage}</Text> : null}
        <Pressable
          disabled={updatePasswordMutation.isPending}
          onPress={() => updatePasswordMutation.mutate()}
          style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}
        >
          <Text style={styles.primaryButtonText}>{updatePasswordMutation.isPending ? "修改中..." : "修改密码"}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: { alignItems: "center", flexDirection: "row", gap: 14 },
  avatar: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 999, height: 72, justifyContent: "center", overflow: "hidden", width: 72 },
  avatarImage: { height: "100%", width: "100%" },
  avatarEmoji: { fontSize: 34 },
  kicker: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: "900" },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  card: { borderRadius: 24, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 14, borderWidth: 1, padding: 12 },
  primaryButton: { alignItems: "center", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "900" }
});
