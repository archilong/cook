import { apiGet, apiPost } from "./client";
import { AuthSession, LoginRequest, RegisterRequest, User } from "@/features/auth/types";

export function register(request: RegisterRequest): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/register", request);
}

export function login(request: LoginRequest): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/login", request);
}

export function logout(): Promise<void> {
  return apiPost<void>("/auth/logout", undefined, { auth: true });
}

export function getMe(): Promise<User> {
  return apiGet<User>("/auth/me", { auth: true });
}
