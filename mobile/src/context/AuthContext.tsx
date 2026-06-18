import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as apiLogin,
  loginWithApple as apiLoginWithApple,
  loginWithGoogle as apiLoginWithGoogle,
  register as apiRegister,
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
  logout: () => Promise<void>;
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

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login: async (payload) => {
        const response = await apiLogin(payload);
        setToken(response.token);
        setUser(response.user);
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      },
      register: async (payload) => {
        const response = await apiRegister(payload);
        setToken(response.token);
        setUser(response.user);
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      },
      loginWithGoogle: async (idToken) => {
        const response = await apiLoginWithGoogle(idToken);
        setToken(response.token);
        setUser(response.user);
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      },
      loginWithApple: async (payload) => {
        const response = await apiLoginWithApple(payload);
        setToken(response.token);
        setUser(response.user);
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      },
      logout: async () => {
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
      },
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be inside AuthProvider");
  }
  return context;
}
