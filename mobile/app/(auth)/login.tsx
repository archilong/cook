import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { loginSchema } from "@/features/auth/schemas";

export default function LoginScreen() {
  const { error, loginWithPassword, status, user } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/(tabs)/recipes" />;
  }

  async function submit() {
    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    setFormError(null);
    await loginWithPassword(result.data);
  }

  return (
    <AppScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>登录 Cook Picture</Text>
        <TextInput
          autoCapitalize="none"
          placeholder="邮箱或手机号"
          value={identifier}
          onChangeText={setIdentifier}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        {formError ? <Text style={{ color: "#DC2626" }}>{formError}</Text> : null}
        {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
        <Button title={status === "loading" ? "登录中..." : "登录"} onPress={submit} />
        <Link href="/(auth)/register">还没有账号？去注册</Link>
      </View>
    </AppScreen>
  );
}
