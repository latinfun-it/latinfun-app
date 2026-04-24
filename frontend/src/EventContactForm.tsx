import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors, radii, spacing } from "./theme";

type InquiryType = "info" | "reservation" | "guestlist";

const TYPES: { key: InquiryType; label: string; icon: any; desc: string }[] = [
  { key: "info", label: "Info evento", icon: "help-circle", desc: "Domande su orari, prezzi, artisti" },
  { key: "reservation", label: "Prenota tavolo", icon: "wine", desc: "Riserva un tavolo per te e amici" },
  { key: "guestlist", label: "Lista omaggio/riduzione", icon: "ticket", desc: "Chiedi ingresso in lista" },
];

export default function EventContactForm({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<InquiryType>("info");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState("2");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openForm = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setSent(false);
    setError(null);
    setName(user.name || "");
    setEmail(user.email || "");
    setOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Inserisci il tuo nome");
    if (!email.includes("@")) return setError("Email non valida");
    if (message.trim().length < 2) return setError("Scrivi un messaggio");
    const p = parseInt(people || "1", 10) || 1;
    setSubmitting(true);
    try {
      await api.post(`/events/${eventId}/inquiries`, {
        event_id: eventId,
        type,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        people: p,
        message: message.trim(),
      });
      setSent(true);
      setMessage("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        testID="event-contact-btn"
        style={styles.cta}
        activeOpacity={0.85}
        onPress={openForm}
      >
        <Ionicons name="mail" size={18} color="#fff" />
        <Text style={styles.ctaText}>Contatta l&apos;organizzatore</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>RICHIESTA</Text>
                <Text style={styles.title} numberOfLines={1}>{eventTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {sent ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={52} color="#10B981" />
                <Text style={styles.successTitle}>Richiesta inviata!</Text>
                <Text style={styles.successDesc}>
                  L&apos;organizzatore ha ricevuto il tuo messaggio e ti ricontattera presto sulla
                  mail o al numero indicato.
                </Text>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  style={[styles.submitBtn, { marginTop: 20 }]}
                  testID="contact-close"
                >
                  <Text style={styles.submitText}>Chiudi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.label}>Tipo di richiesta</Text>
                <View style={{ gap: 8 }}>
                  {TYPES.map((t) => {
                    const active = type === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        testID={`inq-type-${t.key}`}
                        style={[styles.typeRow, active && styles.typeRowActive]}
                        onPress={() => setType(t.key)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={t.icon}
                          size={18}
                          color={active ? "#fff" : colors.brand}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.typeLabel, active && { color: "#fff" }]}>
                            {t.label}
                          </Text>
                          <Text style={[styles.typeDesc, active && { color: "rgba(255,255,255,0.8)" }]}>
                            {t.desc}
                          </Text>
                        </View>
                        {active ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Il tuo nome *</Text>
                <TextInput
                  testID="inq-name"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nome e cognome"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  testID="inq-email"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="la.tua@email.it"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Telefono (opzionale)</Text>
                <TextInput
                  testID="inq-phone"
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+39..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />

                {type !== "info" ? (
                  <>
                    <Text style={styles.label}>Numero persone</Text>
                    <TextInput
                      testID="inq-people"
                      style={styles.input}
                      value={people}
                      onChangeText={setPeople}
                      placeholder="2"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </>
                ) : null}

                <Text style={styles.label}>Messaggio *</Text>
                <TextInput
                  testID="inq-message"
                  style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={
                    type === "reservation"
                      ? "Per quante persone? Preferenze tavolo?"
                      : type === "guestlist"
                      ? "Indica i nomi per la lista o dettagli utili..."
                      : "Cosa vuoi sapere?"
                  }
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  testID="inq-submit"
                  onPress={submit}
                  disabled={submitting}
                  style={[styles.submitBtn, { marginTop: 18 }]}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#fff" />
                      <Text style={styles.submitText}>Invia richiesta</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.disclaimer}>
                  I tuoi dati vengono inviati solo all&apos;organizzatore dell&apos;evento.
                </Text>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "92%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#333",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: -0.3, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#fff", fontWeight: "700", fontSize: 12, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgTertiary,
  },
  typeRowActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  typeLabel: { color: "#fff", fontWeight: "800", fontSize: 14 },
  typeDesc: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  error: { color: colors.error, marginTop: 12, fontSize: 13 },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 16,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  successTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 22,
    marginTop: 14,
    textAlign: "center",
  },
  successDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
});
