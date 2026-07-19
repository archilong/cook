import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { registerSchema } from "@/features/auth/schemas";

export default function RegisterScreen() {
  const { error, registerWithPassword, status, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/(tabs)/recipes" />;
  }

  async function submit() {
    const result = registerSchema.safeParse({ email, phone, nickname, password, confirmPassword });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    setFormError(null);
    await registerWithPassword({
      email: result.data.email || null,
      phone: result.data.phone || null,
      nickname: result.data.nickname,
      password: result.data.password
    });
  }

  return (
    <AppScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>注册账号</Text>
        <TextInput
          autoCapitalize="none"
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="手机号（可选，如果已填邮箱）"
          value={phone}
          onChangeText={setPhone}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="昵称"
          value={nickname}
          onChangeText={setNickname}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="确认密码"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        {formError ? <Text style={{ color: "#DC2626" }}>{formError}</Text> : null}
        {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
        <Button title={status === "loading" ? "注册中..." : "注册"} onPress={submit} />
        <Link href="/(auth)/login">已有账号？去登录</Link>
      </View>
    </AppScreen>
  );
}
