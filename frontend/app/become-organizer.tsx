import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, formatApiError } from "../src/api";
import { colors, radii, spacing } from "../src/theme";
import { useI18n } from "../src/i18n";

const ORG_TYPES = ["dj", "gestore_locale", "promoter", "festival", "scuola_ballo", "privato"];
const ORG_ICONS: Record<string, string> = {
  dj: "headset",
  gestore_locale: "business",
  promoter: "megaphone",
  festival: "musical-notes",
  scuola_ballo: "school",
  privato: "person",
};

export default function BecomeOrganizer() {
  const router = useRouter();
  const { t } = useI18n();

  const [organizerType, setOrganizerType] = useState("dj");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/me/organizer");
        if (r.data?.is_organizer) {
          setExisting(r.data);
          setOrganizerType(r.data.organizer_type || "dj");
          setBusinessName(r.data.business_name || "");
          setPhone(r.data.phone || "");
          setTaxId(r.data.tax_id || "");
          setInstagram(r.data.instagram || "");
          setWebsite(r.data.website || "");
          setAgree(true);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    setError(null);
    if (!businessName.trim() || businessName.trim().length < 2) {
      setError(t("organizer.errors.businessName"));
      return;
    }
    if (!phone.trim() || phone.trim().length < 6) {
      setError(t("organizer.errors.phone"));
      return;
    }
    if (!agree) {
      setError(t("organizer.errors.agree"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/me/organizer", {
        organizer_type: organizerType,
        business_name: businessName.trim(),
        phone: phone.trim(),
        tax_id: taxId.trim() || undefined,
        instagram: instagram.trim() || undefined,
        website: website.trim() || undefined,
      });
      Alert.alert(t("organizer.successTitle"), t("organizer.successBody"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || e.message || t("events.fields.errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="become-organizer">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{t("organizer.kicker")}</Text>
            <Text style={styles.title}>
              {existing ? t("organizer.editTitle") : t("organizer.title")}
            </Text>
          </View>
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>{t("organizer.lead")}</Text>

          <L t={`${t("organizer.type")} *`} />
          <View style={styles.chipRow}>
            {ORG_TYPES.map((key) => {
              const active = organizerType === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setOrganizerType(key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Ionicons
                    name={ORG_ICONS[key] as any}
                    size={14}
                    color={active ? "#fff" : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(`events.organizerTypes.${key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <L t={`${t("organizer.businessName")} *`} />
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder={t("organizer.businessNamePlaceholder")}
            placeholderTextColor={colors.textMuted}
          />

          <L t={`${t("organizer.phone")} *`} />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+39 347 1234567"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
          <Text style={styles.hint}>{t("organizer.phoneHint")}</Text>

          <L t={t("organizer.taxId")} />
          <TextInput
            style={styles.input}
            value={taxId}
            onChangeText={setTaxId}
            placeholder={t("organizer.taxIdPlaceholder")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />

          <L t={t("organizer.instagram")} />
          <TextInput
            style={styles.input}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="@nomeutente"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <L t={t("organizer.website")} />
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />

          {/* Checkbox dichiarazione */}
          <TouchableOpacity onPress={() => setAgree((v) => !v)} style={styles.agreeRow}>
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {agree ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.agreeText}>{t("organizer.agreeLabel")}</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submit, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={existing ? "save" : "checkmark-circle"} size={18} color="#fff" />
                <Text style={styles.submitText}>
                  {existing ? t("organizer.save") : t("organizer.activate")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {existing ? (
            <View style={[styles.infoBox, { marginTop: 16 }]}>
              <Text style={styles.infoText}>
                {existing.verified ? `⭐ ${t("organizer.verified")}` : t("organizer.notVerified")}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function L({ t }: { t: string }) {
  return <Text style={styles.label}>{t}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  lead: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  label: { color: "#fff", fontWeight: "700", fontSize: 12, marginTop: 14, marginBottom: 8, letterSpacing: 0.5 },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 6, fontStyle: "italic" },
  input: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    color: "#fff", fontSize: 14, minHeight: 44,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.bgTertiary, borderRadius: radii.pill,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center",
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 18 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  agreeText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
  error: { color: colors.error, marginTop: 14, fontSize: 13 },
  submit: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: colors.brand, borderRadius: radii.pill,
    paddingVertical: 16, marginTop: 22,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  infoBox: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 14,
  },
  infoText: { color: colors.textSecondary, fontSize: 13 },
});
