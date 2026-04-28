import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, TOKEN_KEY, formatApiError } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  referral_code?: string | null;
  referred_by?: string | null;
  created_at: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
      setUser(data.user);
    } catch (e: any) {
      // Build a verbose error so we can see WHAT actually failed
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      const code = e?.code;
      const baseUrl = (api.defaults?.baseURL || "").toString();
      let msg: string;
      if (detail) {
        msg = formatApiError(detail);
      } else if (status) {
        msg = `Errore server ${status}`;
      } else if (code === "ECONNABORTED") {
        msg = `Timeout: il server non risponde. URL: ${baseUrl}`;
      } else if (e?.message?.includes("Network")) {
        msg = `Errore di rete. Server non raggiungibile.\nURL: ${baseUrl}\nMsg: ${e.message}`;
      } else {
        msg = `${e?.message || "Errore sconosciuto"} (URL: ${baseUrl})`;
      }
      console.log("[LOGIN ERROR]", { status, detail, code, message: e?.message, baseUrl });
      throw new Error(msg);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    referralCode?: string
  ) => {
    try {
      const body: any = { email, password, name };
      if (referralCode && referralCode.trim()) {
        body.referral_code = referralCode.trim().toUpperCase();
      }
      const { data } = await api.post("/auth/register", body);
      await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
      setUser(data.user);
    } catch (e: any) {
      throw new Error(formatApiError(e?.response?.data?.detail) || e.message);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
