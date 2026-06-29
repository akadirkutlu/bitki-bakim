import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  deleteAccount as apiDeleteAccount,
  login as apiLogin,
  loginAsGuest as apiLoginAsGuest,
  loginWithApple as apiLoginWithApple,
  loginWithGoogle as apiLoginWithGoogle,
  register as apiRegister,
  getMe,
} from "../services/api";
import type { User } from "../types";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (payload: {
    identityToken: string;
    fullName?: {
      givenName?: string;
      familyName?: string;
    };
  }) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const timeout = setTimeout(() => {
      if (alive) {
        setLoading(false);
      }
    }, 3000);

    async function bootstrap() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          try {
            setToken(storedToken);
            setUser(JSON.parse(storedUser) as User);
          } catch {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          }
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
        clearTimeout(timeout);
      }
    }

    bootstrap().catch(() => {
      if (alive) {
        setLoading(false);
      }
      clearTimeout(timeout);
    });

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    // When the current session is an anonymous guest, pass its token so the
    // backend converts that guest account into a real one (preserving plants).
    const guestUpgradeToken =
      user?.authProvider === "guest" && token ? token : undefined;

    async function persistSession(response: { token: string; user: User }) {
      setToken(response.token);
      setUser(response.user);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }

    async function clearSession() {
      setToken(null);
      setUser(null);
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }

    return {
      token,
      user,
      loading,
      login: async (payload) => {
        await persistSession(await apiLogin(payload));
      },
      register: async (payload) => {
        await persistSession(await apiRegister(payload, guestUpgradeToken));
      },
      loginWithGoogle: async (idToken) => {
        await persistSession(await apiLoginWithGoogle(idToken, guestUpgradeToken));
      },
      loginWithApple: async (payload) => {
        await persistSession(await apiLoginWithApple(payload, guestUpgradeToken));
      },
      loginAsGuest: async () => {
        await persistSession(await apiLoginAsGuest());
      },
      deleteAccount: async () => {
        if (token) {
          await apiDeleteAccount(token);
        }
        await clearSession();
      },
      refreshUser: async () => {
        if (!token) {
          return null;
        }
        const nextUser = await getMe(token);
        setUser(nextUser);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        return nextUser;
      },
      updateUser: async (nextUser) => {
        setUser(nextUser);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      },
      logout: async () => {
        await clearSession();
      },
    };
  }, [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be inside AuthProvider");
  }
  return context;
}
