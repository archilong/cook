# Settings Secondary Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the mobile settings tab into a menu of seven secondary-page entries and add account password change with confirmation.

**Architecture:** Keep the settings tab as a navigation-only directory. Move each editable settings concern into a focused Expo Router page under `mobile/app/settings/`, reusing the existing `users` API module and React Query cache keys. Add the minimal backend password-change endpoint needed by the account page.

**Tech Stack:** React Native, Expo Router, TypeScript, TanStack Query, Zustand, FastAPI, SQLAlchemy, Pydantic, pytest.

---

## File Structure

**Backend**

- Modify: `backend/app/schemas/user.py`
  - Add `PasswordUpdate` request schema with `current_password` and `new_password`.
- Modify: `backend/app/services/user_service.py`
  - Add `update_user_password()` that verifies current password and stores a new hash.
- Modify: `backend/app/api/v1/users.py`
  - Add `POST /api/v1/users/me/password` endpoint.
- Modify: `backend/app/tests/test_users.py`
  - Add tests for successful password change, wrong current password, and login with old/new password.

**Mobile API and types**

- Modify: `mobile/src/features/auth/types.ts`
  - Add `PasswordUpdateRequest` type.
- Modify: `mobile/src/api/users.ts`
  - Import `apiPost`.
  - Add `updateMyPassword()`.

**Mobile screens**

- Modify: `mobile/app/_layout.tsx`
  - Register stack screens for `settings/account`, `settings/reminders`, `settings/theme`, and `settings/appearance`.
- Replace: `mobile/app/(tabs)/settings.tsx`
  - Settings menu only, with seven entry buttons plus API status and logout.
- Create: `mobile/app/settings/account.tsx`
  - Nickname edit and password change form.
- Create: `mobile/app/settings/reminders.tsx`
  - Notifications toggle and default reminder minutes.
- Create: `mobile/app/settings/theme.tsx`
  - Theme mode and primary color.
- Create: `mobile/app/settings/appearance.tsx`
  - Family appearance reserved-state page.

---

### Task 1: Add Backend Password Change API

**Files:**
- Modify: `backend/app/schemas/user.py`
- Modify: `backend/app/services/user_service.py`
- Modify: `backend/app/api/v1/users.py`
- Test: `backend/app/tests/test_users.py`

- [ ] **Step 1: Write failing backend tests**

Append these tests to `backend/app/tests/test_users.py`:

```python
def test_update_password_allows_login_with_new_password(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "secret123", "new_password": "newsecret123"},
        headers=headers,
    )

    assert response.status_code == 204

    old_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "secret123"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "newsecret123"},
    )
    assert new_login.status_code == 200


def test_update_password_rejects_wrong_current_password(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "wrong", "new_password": "newsecret123"},
        headers=headers,
    )

    assert response.status_code == 400
    assert "当前密码" in response.text

    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "secret123"},
    )
    assert login.status_code == 200


def test_update_password_validates_new_password_length(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "secret123", "new_password": "short"},
        headers=headers,
    )

    assert response.status_code == 422
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run from `D:/USERDesk/code1/cook_picture/backend`:

```bash
python -m pytest app/tests/test_users.py -v
```

Expected: the new password tests fail because `/api/v1/users/me/password` does not exist yet.

- [ ] **Step 3: Add password update schema**

Modify `backend/app/schemas/user.py` so the bottom of the file includes:

```python
class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
```

Keep the existing `UserBase`, `UserRead`, and `UserUpdate` definitions unchanged.

- [ ] **Step 4: Add password update service**

Modify imports and add a function in `backend/app/services/user_service.py`:

```python
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User, UserSettings
from app.schemas.user import PasswordUpdate, UserUpdate
from app.schemas.user_settings import UserSettingsUpdate
```

Add this function after `update_user_profile()`:

```python
def update_user_password(db: Session, user: User, request: PasswordUpdate) -> None:
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码不正确。",
        )

    user.password_hash = hash_password(request.new_password)
    db.commit()
```

Leave the existing settings functions unchanged.

- [ ] **Step 5: Add password endpoint**

Modify `backend/app/api/v1/users.py` imports:

```python
from fastapi import APIRouter, Depends, Response, status
```

Modify schema import:

```python
from app.schemas.user import PasswordUpdate, UserRead, UserUpdate
```

Modify service import:

```python
from app.services.user_service import (
    get_or_create_user_settings,
    update_user_password,
    update_user_profile,
    update_user_settings,
)
```

Add this endpoint after `update_me()`:

```python
@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_my_password(
    request: PasswordUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    update_user_password(db, current_user, request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Run backend tests**

Run from `backend`:

```bash
python -m pytest app/tests/test_users.py -v
```

Expected: all tests in `test_users.py` pass.

---

### Task 2: Add Mobile Password API Types

**Files:**
- Modify: `mobile/src/features/auth/types.ts`
- Modify: `mobile/src/api/users.ts`

- [ ] **Step 1: Add password request type**

Append to `mobile/src/features/auth/types.ts`:

```ts
export type PasswordUpdateRequest = {
  current_password: string;
  new_password: string;
};
```

- [ ] **Step 2: Add password API wrapper**

Modify `mobile/src/api/users.ts` imports:

```ts
import { apiGet, apiPatch, apiPost } from "./client";
import { PasswordUpdateRequest, User, UserUpdate } from "@/features/auth/types";
import { UserSettings, UserSettingsUpdate } from "@/features/settings/types";
```

Append this function:

```ts
export function updateMyPassword(request: PasswordUpdateRequest): Promise<void> {
  return apiPost<void>("/users/me/password", request, { auth: true });
}
```

- [ ] **Step 3: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 3: Register Settings Secondary Routes

**Files:**
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 1: Add stack screens**

In `mobile/app/_layout.tsx`, replace the existing settings stack block:

```tsx
          <Stack.Screen name="settings/help" options={{ title: "帮助" }} />
          <Stack.Screen name="settings/feedback" options={{ title: "反馈" }} />
          <Stack.Screen name="settings/about" options={{ title: "关于" }} />
```

with:

```tsx
          <Stack.Screen name="settings/account" options={{ title: "账户" }} />
          <Stack.Screen name="settings/reminders" options={{ title: "提醒管理" }} />
          <Stack.Screen name="settings/theme" options={{ title: "主题" }} />
          <Stack.Screen name="settings/appearance" options={{ title: "外观" }} />
          <Stack.Screen name="settings/help" options={{ title: "帮助" }} />
          <Stack.Screen name="settings/feedback" options={{ title: "反馈" }} />
          <Stack.Screen name="settings/about" options={{ title: "关于" }} />
```

- [ ] **Step 2: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: if new page files are not created yet, this may still pass because Expo Router resolves routes at runtime. Continue to Task 4.

---

### Task 4: Replace Settings Tab With Entry Menu

**Files:**
- Replace: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Replace the settings tab file**

Replace all content in `mobile/app/(tabs)/settings.tsx` with:

```tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getHealth } from "@/api/health";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

type SettingsEntry = {
  title: string;
  description: string;
  href: string;
};

const entries: SettingsEntry[] = [
  { title: "账户", description: "昵称、密码和登录信息", href: "/settings/account" },
  { title: "提醒管理", description: "通知开关和默认提醒时间", href: "/settings/reminders" },
  { title: "主题", description: "深浅色模式和主题色", href: "/settings/theme" },
  { title: "外观", description: "家庭空间外观预留设置", href: "/settings/appearance" },
  { title: "帮助", description: "查看使用说明", href: "/settings/help" },
  { title: "反馈", description: "发送问题和建议", href: "/settings/feedback" },
  { title: "关于", description: "版本和隐私说明", href: "/settings/about" }
];

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();
  const { theme } = useAppTheme();

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false
  });

  async function handleLogout() {
    await logout();
    queryClient.clear();
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>设置</Text>
      <Text style={{ color: theme.mutedTextColor }}>API 状态：{healthQuery.data?.status ?? "未连接"}</Text>
      {healthQuery.error ? <Text style={{ color: "#DC2626" }}>API 连接失败，请确认后端已启动。</Text> : null}

      <View style={[styles.menu, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        {entries.map((entry, index) => (
          <Pressable
            key={entry.href}
            onPress={() => router.push(entry.href)}
            style={[
              styles.menuItem,
              index < entries.length - 1 ? { borderBottomColor: theme.borderColor, borderBottomWidth: 1 } : null
            ]}
          >
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: theme.textColor }]}>{entry.title}</Text>
              <Text style={{ color: theme.mutedTextColor }}>{entry.description}</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.mutedTextColor }]}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={handleLogout} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
        <Text style={{ color: "#DC2626", fontWeight: "800" }}>退出登录</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  menu: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 14 },
  menuText: { flex: 1, gap: 4 },
  menuTitle: { fontSize: 16, fontWeight: "800" },
  chevron: { fontSize: 28, lineHeight: 28 },
  dangerButton: { alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 12 }
});
```

- [ ] **Step 2: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass or fail only because route string typing is stricter than expected. If route string typing fails, cast the href in `router.push(entry.href as never)` as the smallest local workaround.

---

### Task 5: Create Account Settings Page

**Files:**
- Create: `mobile/app/settings/account.tsx`

- [ ] **Step 1: Create account page**

Create `mobile/app/settings/account.tsx` with:

```tsx
import { useMutation } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { updateMe, updateMyPassword } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function AccountSettingsScreen() {
  const { setUser, user } = useAuthStore();
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

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>账户</Text>
      <Text style={{ color: theme.mutedTextColor }}>当前用户：{user.email ?? user.phone}</Text>

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
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
```

- [ ] **Step 2: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 6: Create Reminders Settings Page

**Files:**
- Create: `mobile/app/settings/reminders.tsx`

- [ ] **Step 1: Create reminders page**

Create `mobile/app/settings/reminders.tsx` with:

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getMySettings, updateMySettings } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function ReminderSettingsScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { theme } = useAppTheme();
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState("30");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({ queryKey: ["my-settings"], queryFn: getMySettings, enabled: Boolean(user) });

  useEffect(() => {
    if (settingsQuery.data) {
      setDefaultReminderMinutes(String(settingsQuery.data.default_reminder_minutes));
      setNotificationsEnabled(settingsQuery.data.notifications_enabled);
    }
  }, [settingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      const parsedMinutes = Number(defaultReminderMinutes);
      if (!Number.isInteger(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 1440) {
        throw new Error("默认提醒时间需为 0 到 1440 之间的整数。");
      }
      return updateMySettings({ default_reminder_minutes: parsedMinutes, notifications_enabled: notificationsEnabled });
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async () => {
      setMessage("提醒设置已保存。");
      await queryClient.invalidateQueries({ queryKey: ["my-settings"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "保存提醒设置失败，请稍后重试。");
    }
  });

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>提醒管理</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}> 
        <View style={styles.rowBetween}>
          <Text style={{ color: theme.textColor }}>本地提醒和站内通知</Text>
          <Pressable
            onPress={() => setNotificationsEnabled((value) => !value)}
            style={[
              styles.chip,
              {
                backgroundColor: notificationsEnabled ? theme.primaryColor : theme.backgroundColor,
                borderColor: notificationsEnabled ? theme.primaryColor : theme.borderColor
              }
            ]}
          >
            <Text style={{ color: notificationsEnabled ? "white" : theme.textColor }}>{notificationsEnabled ? "已开启" : "已关闭"}</Text>
          </Pressable>
        </View>
        <TextInput
          keyboardType="number-pad"
          placeholder="默认提前提醒分钟数"
          value={defaultReminderMinutes}
          onChangeText={setDefaultReminderMinutes}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
        <View style={styles.optionRow}>
          {[15, 30, 60].map((minutes) => (
            <Pressable key={minutes} onPress={() => setDefaultReminderMinutes(String(minutes))} style={[styles.chip, { borderColor: theme.borderColor }]}> 
              <Text style={{ color: theme.textColor }}>提前 {minutes} 分钟</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {message ? <Text style={{ color: theme.primaryColor }}>{message}</Text> : null}
      <Pressable disabled={updateSettingsMutation.isPending} onPress={() => updateSettingsMutation.mutate()} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}> 
        <Text style={styles.primaryButtonText}>{updateSettingsMutation.isPending ? "保存中..." : "保存提醒设置"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
```

- [ ] **Step 2: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 7: Create Theme Settings Page

**Files:**
- Create: `mobile/app/settings/theme.tsx`

- [ ] **Step 1: Create theme page**

Create `mobile/app/settings/theme.tsx` with:

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getMySettings, updateMySettings } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { ThemeMode } from "@/theme/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

const primaryColorPresets = ["#F97316", "#22C55E", "#3B82F6", "#EC4899"];

export default function ThemeSettingsScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { applySettingsTheme, theme } = useAppTheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [primaryColor, setPrimaryColor] = useState("#F97316");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({ queryKey: ["my-settings"], queryFn: getMySettings, enabled: Boolean(user) });

  useEffect(() => {
    if (settingsQuery.data) {
      setThemeMode(settingsQuery.data.theme_mode);
      setPrimaryColor(settingsQuery.data.primary_color);
    }
  }, [settingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
        throw new Error("主题色需要是 #RRGGBB 格式。");
      }
      return updateMySettings({ theme_mode: themeMode, primary_color: primaryColor });
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (settings) => {
      applySettingsTheme(settings);
      setMessage("主题设置已保存。");
      await queryClient.invalidateQueries({ queryKey: ["my-settings"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "保存主题设置失败，请稍后重试。");
    }
  });

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>主题</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}> 
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>主题模式</Text>
        <View style={styles.optionRow}>
          {(["light", "dark"] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={[
                styles.chip,
                {
                  backgroundColor: themeMode === mode ? theme.primaryColor : theme.backgroundColor,
                  borderColor: themeMode === mode ? theme.primaryColor : theme.borderColor
                }
              ]}
            >
              <Text style={{ color: themeMode === mode ? "white" : theme.textColor }}>{mode === "light" ? "浅色" : "深色"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>主题色</Text>
        <View style={styles.optionRow}>
          {primaryColorPresets.map((color) => (
            <Pressable key={color} onPress={() => setPrimaryColor(color)} style={[styles.colorChip, { backgroundColor: color, borderColor: primaryColor === color ? theme.textColor : color }]}> 
              <Text style={styles.colorChipText}>{primaryColor === color ? "✓" : ""}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          placeholder="#F97316"
          value={primaryColor}
          onChangeText={setPrimaryColor}
          autoCapitalize="characters"
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
      </View>
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {message ? <Text style={{ color: theme.primaryColor }}>{message}</Text> : null}
      <Pressable disabled={updateSettingsMutation.isPending} onPress={() => updateSettingsMutation.mutate()} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}> 
        <Text style={styles.primaryButtonText}>{updateSettingsMutation.isPending ? "保存中..." : "保存主题"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  colorChip: { alignItems: "center", borderRadius: 999, borderWidth: 2, height: 34, justifyContent: "center", width: 34 },
  colorChipText: { color: "white", fontWeight: "900" },
  primaryButton: { alignItems: "center", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
```

- [ ] **Step 2: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 8: Create Appearance Reserved Page

**Files:**
- Create: `mobile/app/settings/appearance.tsx`

- [ ] **Step 1: Create appearance page**

Create `mobile/app/settings/appearance.tsx` with:

```tsx
import { Text, View, StyleSheet } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function AppearanceSettingsScreen() {
  const { theme } = useAppTheme();

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>外观</Text>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}> 
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>家庭空间外观</Text>
        <Text style={{ color: theme.mutedTextColor }}>家庭封面和家庭主题配置已预留，后续版本可为每个家庭设置独立封面和主题。</Text>
        <Text style={{ color: theme.mutedTextColor }}>当前版本暂不提供可编辑外观项。</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 }
});
```

- [ ] **Step 2: Run TypeScript check**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 9: Verify End-to-End Behavior

**Files:**
- No source changes expected unless verification exposes defects.

- [ ] **Step 1: Run backend user tests**

Run from `backend`:

```bash
python -m pytest app/tests/test_users.py -v
```

Expected: pass.

- [ ] **Step 2: Run mobile typecheck**

Run from `mobile`:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 3: Manual app verification**

Run the app from `mobile`:

```bash
npm run web
```

Verify in the browser:

1. Settings tab shows only API status, seven menu buttons, and logout.
2. No account, reminders, theme, or appearance edit form appears directly on the Settings tab.
3. Account opens from the menu.
4. Account nickname save updates displayed user nickname after save.
5. Password change shows an error if current password is blank.
6. Password change shows an error if new passwords do not match.
7. Password change succeeds with current password and matching new passwords, then clears all password inputs.
8. Reminders page saves notification toggle and default reminder minutes.
9. Theme page saves theme mode and primary color, then applies the theme immediately.
10. Appearance, Help, Feedback, and About all open from Settings.

---

## Self-Review Notes

- Spec coverage: all seven settings entries are mapped to routes; account nickname and password change are covered; reminders and theme reuse existing settings API; appearance is intentionally reserved; help, feedback, and about are reused.
- Placeholder scan: no TODO/TBD placeholders remain. The plan gives exact paths, code, commands, and expected outcomes.
- Type consistency: backend request uses `current_password` and `new_password`; mobile type and API wrapper use the same snake_case fields to match existing API style.
