import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { colors, radii, spacing } from "../src/theme";

const CATEGORIES = [
  { key: "bug", label: "Bug / Problema", icon: "bug" as const },
  { key: "suggerimento", label: "Suggerimento", icon: "bulb" as const },
  { key: "collaborazione", label: "Collaborazione", icon: "handshake-outline" as any },
  { key: "sponsorship", label: "Sponsorship", icon: "megaphone" as const },
  { key: "altro", label: "Altro", icon: "chatbubbles" as const },
];

export default function ContactScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [category, setCategory] = useState("altro");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !user) return;
    if (!subject.trim() || subject.trim().length < 3) {
      Alert.alert("Oggetto richiesto", "Inserisci un oggetto descrittivo (min 3 caratteri).");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert("Messaggio troppo corto", "Scrivi almeno 10 caratteri.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/contact", {
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      // Reset campi
      setSubject("");
      setMessage("");
      setCategory("altro");
      // Naviga al profilo - usiamo replace per essere deterministici (anche se non c'è history)
      try {
        if (router.canGoBack && router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/profile" as any);
        }
      } catch {
        router.replace("/(tabs)/profile" as any);
      }
      // Conferma soft (su web compare dopo, su mobile in tempo)
      setTimeout(() => {
        if (Platform.OS === "web") {
          // eslint-disable-next-line no-alert
          window.alert("Messaggio inviato! ✉️\nTi risponderemo via email.");
        } else {
          Alert.alert(
            "Messaggio inviato! ✉️",
            "Grazie. Il team LatinFun ti risponderà via email."
          );
        }
      }, 200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Impossibile inviare. Riprova più tardi.";
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        window.alert("Errore: " + msg);
      } else {
        Alert.alert("Errore invio", msg);
      }
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="contact-screen">
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contattaci</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroBox}>
            <View style={styles.heroIcon}>
              <Ionicons name="mail" size={28} color={colors.brand} />
            </View>
            <Text style={styles.heroTitle}>Hai bisogno di aiuto?</Text>
            <Text style={styles.heroSub}>
              Scrivici e il team LatinFun ti risponderà al più presto via email.
            </Text>
          </View>

          {/* Categoria */}
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  testID={`category-${c.key}`}
                  onPress={() => setCategory(c.key)}
                  style={[styles.catChip, active && styles.catChipActive]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={c.icon}
                    size={14}
                    color={active ? "#fff" : colors.brand}
                  />
                  <Text style={[styles.catText, active && styles.catTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Oggetto */}
          <Text style={styles.label}>Oggetto</Text>
          <TextInput
            testID="contact-subject"
            style={styles.input}
            placeholder="Es. Problema con il pagamento boost"
            placeholderTextColor={colors.textMuted}
            value={subject}
            onChangeText={setSubject}
            maxLength={120}
          />
          <Text style={styles.counter}>{subject.length}/120</Text>

          {/* Messaggio */}
          <Text style={styles.label}>Messaggio</Text>
          <TextInput
            testID="contact-message"
            style={[styles.input, styles.textarea]}
            placeholder="Descrivi il tuo messaggio in dettaglio..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={4000}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{message.length}/4000</Text>

          {/* Email risposta */}
          <View style={styles.emailBox}>
            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.emailText}>
              Risponderemo a:{" "}
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {user?.email || "(devi essere loggato)"}
              </Text>
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            testID="contact-submit"
            onPress={submit}
            disabled={busy || !user}
            activeOpacity={0.9}
            style={[styles.submitBtn, (busy || !user) && { opacity: 0.5 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>Invia a LatinFun</Text>
              </>
            )}
          </TouchableOpacity>

          {!user ? (
            <Text style={styles.warn}>
              Devi essere loggato per inviare un messaggio.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,49,84,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  heroSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },
  label: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.lg,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: "transparent",
  },
  catChipActive: { backgroundColor: colors.brand },
  catText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  catTextActive: { color: "#fff" },
  input: {
    backgroundColor: colors.bgSecondary,
    color: "#fff",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textarea: { minHeight: 140, paddingTop: 12 },
  counter: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  emailBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.lg,
  },
  emailText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radii.pill,
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  warn: {
    color: colors.gold,
    textAlign: "center",
    marginTop: 14,
    fontSize: 12,
  },
});
