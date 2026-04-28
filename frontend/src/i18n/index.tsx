import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { I18n } from "i18n-js";
import it from "./it";
import es from "./es";

export type LanguageCode = "it" | "es";
export type CountryCode = "IT" | "ES" | "AR" | "INT";

const STORAGE_KEY_LANG = "latinfun.lang";
const STORAGE_KEY_COUNTRY = "latinfun.country";

const i18n = new I18n({ it, es });
i18n.enableFallback = true;
i18n.defaultLocale = "it";

interface I18nContextValue {
  lang: LanguageCode;
  country: CountryCode;
  setLang: (l: LanguageCode) => Promise<void>;
  setCountry: (c: CountryCode) => Promise<void>;
  t: (key: string, options?: any) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function detectLangFromDevice(): LanguageCode {
  try {
    const locales = Localization.getLocales();
    const code = locales?.[0]?.languageCode || "it";
    if (code === "es") return "es";
    return "it";
  } catch {
    return "it";
  }
}

function detectCountryFromDevice(): CountryCode {
  try {
    const locales = Localization.getLocales();
    const region = (locales?.[0]?.regionCode || "").toUpperCase();
    if (region === "ES") return "ES";
    if (region === "AR") return "AR";
    if (region === "IT") return "IT";
    // fallback: based on language code
    const lang = locales?.[0]?.languageCode;
    if (lang === "es") return "ES";
    return "IT";
  } catch {
    return "IT";
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("it");
  const [country, setCountryState] = useState<CountryCode>("IT");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedLang = (await AsyncStorage.getItem(STORAGE_KEY_LANG)) as LanguageCode | null;
        const storedCountry = (await AsyncStorage.getItem(STORAGE_KEY_COUNTRY)) as CountryCode | null;

        const initialLang: LanguageCode = storedLang || detectLangFromDevice();
        const initialCountry: CountryCode = storedCountry || detectCountryFromDevice();

        i18n.locale = initialLang;
        setLangState(initialLang);
        setCountryState(initialCountry);

        // Persist auto-detected values so axios interceptor picks them up
        if (!storedLang) await AsyncStorage.setItem(STORAGE_KEY_LANG, initialLang);
        if (!storedCountry) await AsyncStorage.setItem(STORAGE_KEY_COUNTRY, initialCountry);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = useCallback(async (l: LanguageCode) => {
    i18n.locale = l;
    setLangState(l);
    await AsyncStorage.setItem(STORAGE_KEY_LANG, l);
  }, []);

  const setCountry = useCallback(async (c: CountryCode) => {
    setCountryState(c);
    await AsyncStorage.setItem(STORAGE_KEY_COUNTRY, c);
  }, []);

  const t = useCallback((key: string, options?: any) => {
    return i18n.t(key, options);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, country, setLang, setCountry, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback non-throwing implementation
    return {
      lang: "it",
      country: "IT",
      setLang: async () => {},
      setCountry: async () => {},
      t: (k: string) => i18n.t(k),
      ready: true,
    };
  }
  return ctx;
}

// Exported for non-component utilities
export { i18n };
