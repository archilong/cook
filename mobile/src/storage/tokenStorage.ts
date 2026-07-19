import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const accessTokenKey = "cook_picture_access_token";

export async function saveAccessToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(accessTokenKey, token);
    return;
  }
  await SecureStore.setItemAsync(accessTokenKey, token);
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(accessTokenKey);
  }
  return SecureStore.getItemAsync(accessTokenKey);
}

export async function clearAccessToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(accessTokenKey);
    return;
  }
  await SecureStore.deleteItemAsync(accessTokenKey);
}
