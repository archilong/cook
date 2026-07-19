import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppearanceImageSlot, AppearancePreferences, defaultAppearancePreferences } from "./types";

const storageKey = "cook_picture:appearance_preferences";

function normalizePreferences(value: unknown): AppearancePreferences {
  if (!value || typeof value !== "object") {
    return defaultAppearancePreferences;
  }

  const record = value as Partial<Record<AppearanceImageSlot, unknown>>;
  return Object.keys(defaultAppearancePreferences).reduce<AppearancePreferences>((preferences, key) => {
    const slot = key as AppearanceImageSlot;
    const uri = record[slot];
    preferences[slot] = typeof uri === "string" && uri.length > 0 ? uri : null;
    return preferences;
  }, { ...defaultAppearancePreferences });
}

export async function loadAppearancePreferences(): Promise<AppearancePreferences> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) {
    return defaultAppearancePreferences;
  }

  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return defaultAppearancePreferences;
  }
}

export async function saveAppearancePreferences(preferences: AppearancePreferences): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(preferences));
}

export async function updateAppearanceImage(slot: AppearanceImageSlot, uri: string | null): Promise<AppearancePreferences> {
  const current = await loadAppearancePreferences();
  const next = { ...current, [slot]: uri };
  await saveAppearancePreferences(next);
  return next;
}

export async function resetAppearancePreferences(): Promise<AppearancePreferences> {
  await AsyncStorage.removeItem(storageKey);
  return defaultAppearancePreferences;
}
