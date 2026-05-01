import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const TOKEN_KEY = "latinfun.token";
export const COUNTRY_KEY = "latinfun.country";
export const LANG_KEY = "latinfun.lang";

function deviceCountryFallback(): string {
  try {
    const locales = Localization.getLocales?.() || [];
    const region = (locales[0]?.regionCode || "").toUpperCase();
    if (region === "ES") return "ES";
    if (region === "AR") return "AR";
  } catch {}
  return "IT"; // Always default to IT
}

function deviceLangFallback(): string {
  try {
    const locales = Localization.getLocales?.() || [];
    const code = (locales[0]?.languageCode || "").toLowerCase();
    if (code === "es") return "es";
  } catch {}
  return "it"; // Always default to IT
}

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Country & language headers (for backend filtering / localization)
  try {
    const country = (await AsyncStorage.getItem(COUNTRY_KEY)) || deviceCountryFallback();
    const lang = (await AsyncStorage.getItem(LANG_KEY)) || deviceLangFallback();
    config.headers["X-Country"] = country;
    config.headers["X-Lang"] = lang;
  } catch {}
  return config;
});

// Response interceptor: gestisce token scaduto/non valido (401)
// pulisce lo storage in modo che AuthProvider rilevi l'assenza di token e riporti al login
let tokenExpiredHandler: (() => void) | null = null;
export function setTokenExpiredHandler(h: () => void) {
  tokenExpiredHandler = h;
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const status = error?.response?.status;
    const url = (error?.config?.url || "") as string;
    // ignora 401 sull'endpoint di login (non è scadenza ma credenziali errate)
    const isLogin = url.includes("/auth/login") || url.includes("/auth/register");
    if (status === 401 && !isLogin) {
      try {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } catch {}
      if (tokenExpiredHandler) {
        try {
          tokenExpiredHandler();
        } catch {}
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(detail: any): string {
  if (detail == null) return "Qualcosa è andato storto. Riprova.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
