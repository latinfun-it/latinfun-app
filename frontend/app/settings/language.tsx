import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n, type LanguageCode } from "../../src/i18n";

const LANGS: { code: LanguageCode; flag: string; name: string; native: string }[] = [
  { code: "it", flag: "🇮🇹", name: "Italiano", native: "Italiano" },
  { code: "es", flag: "🇪🇸", name: "Spagnolo", native: "Español" },
];

export default function LanguageSettings() {
  const router = useRouter();
  const { lang, setLang } = useI18n();

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Lingua / Idioma</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          Scegli la lingua dell'app · Elige el idioma de la app
        </Text>

        {LANGS.map((l) => {
          const active = lang === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              testID={`lang-${l.code}`}
              style={[styles.row, active && styles.rowActive]}
              activeOpacity={0.85}
              onPress={async () => {
                await setLang(l.code);
              }}
            >
              <Text style={styles.flag}>{l.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.langName}>{l.native}</Text>
                <Text style={styles.langSub}>{l.name}</Text>
              </View>
              {active && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.note}>
          La traduzione completa dell'app verrà rilasciata progressivamente.
          {"\n"}La traducción completa de la app se publicará progresivamente.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.lg, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowActive: { borderColor: colors.brand, backgroundColor: "rgba(255,71,87,0.08)" },
  flag: { fontSize: 32, marginRight: spacing.md },
  langName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  langSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xl, textAlign: "center", lineHeight: 18 },
});
