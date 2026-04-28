import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n, type CountryCode } from "../../src/i18n";

const COUNTRIES: { code: CountryCode; flag: string; name: string }[] = [
  { code: "IT", flag: "🇮🇹", name: "Italia" },
  { code: "ES", flag: "🇪🇸", name: "España" },
  { code: "INT", flag: "🌍", name: "Internazionale (tutti i paesi)" },
];

export default function CountrySettings() {
  const router = useRouter();
  const { country, setCountry, lang } = useI18n();

  const isES = lang === "es";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{isES ? "País" : "Paese"}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          {isES
            ? "Selecciona tu país: solo verás eventos, escuelas y DJs de esa zona."
            : "Seleziona il tuo paese: vedrai solo eventi, scuole e DJ di quella zona."}
        </Text>

        {COUNTRIES.map((c) => {
          const active = country === c.code;
          return (
            <TouchableOpacity
              key={c.code}
              testID={`country-${c.code}`}
              style={[styles.row, active && styles.rowActive]}
              activeOpacity={0.85}
              onPress={async () => {
                await setCountry(c.code);
                Alert.alert(
                  isES ? "País actualizado" : "Paese aggiornato",
                  isES
                    ? "Recarga la app para ver el nuevo contenido."
                    : "Ricarica l'app per vedere il nuovo contenuto.",
                );
              }}
            >
              <Text style={styles.flag}>{c.flag}</Text>
              <Text style={styles.countryName}>{c.name}</Text>
              {active && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.note}>
          {isES
            ? "Puedes cambiar el país en cualquier momento desde este menú."
            : "Puoi cambiare paese in qualsiasi momento da questo menu."}
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
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.lg, textAlign: "center", lineHeight: 18 },
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
    gap: spacing.md,
  },
  rowActive: { borderColor: colors.brand, backgroundColor: "rgba(255,71,87,0.08)" },
  flag: { fontSize: 32 },
  countryName: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
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
