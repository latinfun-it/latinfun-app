import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const TOKEN_KEY = "latinfun.token";
export const COUNTRY_KEY = "latinfun.country";
export const LANG_KEY = "latinfun.lang";

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
    const country = await AsyncStorage.getItem(COUNTRY_KEY);
    const lang = await AsyncStorage.getItem(LANG_KEY);
    if (country) config.headers["X-Country"] = country;
    if (lang) config.headers["X-Lang"] = lang;
  } catch {}
  return config;
});

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
