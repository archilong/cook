import { create } from "zustand";

import { getMe, login, register } from "@/api/auth";
import { isAuthApiError } from "@/api/client";
import { AuthSession, LoginRequest, RegisterRequest, User } from "@/features/auth/types";
import { clearAccessToken, getAccessToken, saveAccessToken } from "@/storage/tokenStorage";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  restoreSession: () => Promise<void>;
  loginWithPassword: (request: LoginRequest) => Promise<void>;
  registerWithPassword: (request: RegisterRequest) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
};

let authOperationVersion = 0;

function nextAuthOperationVersion(): number {
  authOperationVersion += 1;
  return authOperationVersion;
}

function isLatestAuthOperation(version: number): boolean {
  return version === authOperationVersion;
}

let desiredPersistedToken: string | null = null;
let tokenWriteQueue: Promise<void> = Promise.resolve();

function setDesiredPersistedToken(token: string | null): void {
  desiredPersistedToken = token;
}

async function writePersistedToken(token: string | null): Promise<void> {
  if (token) {
    await saveAccessToken(token);
    return;
  }
  await clearAccessToken();
}

function runLatestTokenWrite(version: number, token: string | null): Promise<void> {
  setDesiredPersistedToken(token);
  const write = tokenWriteQueue.then(async () => {
    if (!isLatestAuthOperation(version) || desiredPersistedToken !== token) {
      return;
    }

    await writePersistedToken(token);

    if (!isLatestAuthOperation(version) || desiredPersistedToken !== token) {
      await writePersistedToken(desiredPersistedToken);
    }
  });
  tokenWriteQueue = write.catch(() => undefined);
  return write;
}

async function persistLatestSession(session: AuthSession, version: number): Promise<User | null> {
  if (!isLatestAuthOperation(version)) {
    return null;
  }
  await runLatestTokenWrite(version, session.access_token);
  if (!isLatestAuthOperation(version)) {
    return null;
  }
  return session.user;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  error: null,

  async restoreSession() {
    const version = nextAuthOperationVersion();
    set({ status: "loading", error: null });
    const token = await getAccessToken();
    if (!isLatestAuthOperation(version)) {
      return;
    }
    setDesiredPersistedToken(token);
    if (!token) {
      set({ user: null, status: "unauthenticated" });
      return;
    }

    try {
      const user = await getMe();
      if (!isLatestAuthOperation(version)) {
        return;
      }
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      if (!isLatestAuthOperation(version)) {
        return;
      }
      if (isAuthApiError(error)) {
        await runLatestTokenWrite(version, null);
        if (!isLatestAuthOperation(version)) {
          return;
        }
        set({ user: null, status: "unauthenticated", error: "登录已过期，请重新登录" });
        return;
      }
      const existingUser = get().user;
      set({
        user: existingUser,
        status: existingUser ? "authenticated" : "unauthenticated",
        error: error instanceof Error ? error.message : "登录状态检查失败，请稍后重试"
      });
    }
  },

  async loginWithPassword(request) {
    const version = nextAuthOperationVersion();
    set({ status: "loading", error: null });
    try {
      const user = await persistLatestSession(await login(request), version);
      if (!user || !isLatestAuthOperation(version)) {
        return;
      }
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      if (!isLatestAuthOperation(version)) {
        return;
      }
      set({ user: null, status: "unauthenticated", error: error instanceof Error ? error.message : "登录失败" });
    }
  },

  async registerWithPassword(request) {
    const version = nextAuthOperationVersion();
    set({ status: "loading", error: null });
    try {
      const user = await persistLatestSession(await register(request), version);
      if (!user || !isLatestAuthOperation(version)) {
        return;
      }
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      if (!isLatestAuthOperation(version)) {
        return;
      }
      set({ user: null, status: "unauthenticated", error: error instanceof Error ? error.message : "注册失败" });
    }
  },

  setUser(user) {
    set({ user, status: "authenticated", error: null });
  },

  async logout() {
    const version = nextAuthOperationVersion();
    await runLatestTokenWrite(version, null);
    if (!isLatestAuthOperation(version)) {
      return;
    }
    set({ user: null, status: "unauthenticated", error: null });
  }
}));
