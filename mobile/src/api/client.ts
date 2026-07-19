import Constants from "expo-constants";
import { Platform } from "react-native";

import { getAccessToken } from "@/storage/tokenStorage";

const nativeFallbackApiBaseUrl = "http://10.0.2.2:8000/api/v1";
const webFallbackApiBaseUrl = "http://127.0.0.1:8000/api/v1";

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === "web"
    ? webFallbackApiBaseUrl
    : ((Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? nativeFallbackApiBaseUrl));

type RequestOptions = {
  auth?: boolean;
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isAuthApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `${method} ${path} failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>("GET", path, options);
}

export function apiPost<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>("POST", path, { ...options, body });
}

export function apiPatch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>("PATCH", path, { ...options, body });
}

export function apiDelete<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>("DELETE", path, options);
}
