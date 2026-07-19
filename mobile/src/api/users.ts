import { apiGet, apiPatch, apiPost } from "./client";
import { PasswordUpdateRequest, User, UserUpdate } from "@/features/auth/types";
import { UserSettings, UserSettingsUpdate } from "@/features/settings/types";

export function updateMe(request: UserUpdate): Promise<User> {
  return apiPatch<User>("/users/me", request, { auth: true });
}

export function getMySettings(): Promise<UserSettings> {
  return apiGet<UserSettings>("/users/me/settings", { auth: true });
}

export function updateMySettings(request: UserSettingsUpdate): Promise<UserSettings> {
  return apiPatch<UserSettings>("/users/me/settings", request, { auth: true });
}

export function updateMyPassword(request: PasswordUpdateRequest): Promise<void> {
  return apiPost<void>("/users/me/password", request, { auth: true });
}
