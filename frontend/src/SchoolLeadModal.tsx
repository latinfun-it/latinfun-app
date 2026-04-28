import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors, radii, spacing } from "./theme";

const LEVELS = [
  { key: "principiante", label: "Principiante" },
  { key: "intermedio", label: "Intermedio" },
  { key: "avanzato", label: "Avanzato" },
];

const STYLE_OPTIONS = [
  "bachata",
  "salsa",
  "kizomba",
  "merengue",
  "reggaeton",
  "cumbia",
  "afrobeat",
];

export default function SchoolLeadModal({
  visible,
  onClose,
  schoolId,
  schoolName,
  defaultStyles = [],
}: {
  visible: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  defaultStyles?: string[];
}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("principiante");
  const [styles2, setStyles2] = useState<string[]>(defaultStyles.slice(0, 2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleStyle = (s: string) => {
    setStyles2((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const submit = async () => {
    if (busy) return;
    if (!name.trim() || name.trim().length < 2) {
      return alert("Inserisci il tuo nome");
    }
    if (!email.trim() || !email.includes("@")) {
      return alert("Inserisci una email valida");
    }
    if (!message.trim() || message.trim().length < 10) {
      return alert("Scrivi un messaggio (min 10 caratteri)");
    }
    setBusy(true);
    try {
      await api.post(`/schools/${schoolId}/leads`, {
        sender_name: name.trim(),
        sender_email: email.trim(),
        sender_phone: phone.trim() || undefined,
        level,
        styles: styles2,
        message: message.trim(),
      });
      // Success
      const successMsg =
        "Richiesta inviata! ✉️\nLa scuola ti contatterà via email entro 48h.";
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        window.alert(successMsg);
      } else {
        Alert.alert("Richiesta inviata", successMsg);
      }
      // Reset form
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPhone("");
      setLevel("principiante");
      setStyles2(defaultStyles.slice(0, 2));
      setMessage("");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Errore invio";
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        window.alert("Errore: " + msg);
      } else {
        Alert.alert("Errore", msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Richiedi info</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.heroBox}>
              <View style={s.heroIcon}>
                <Ionicons name="school" size={26} color={colors.brand} />
              </View>
              <Text style={s.heroTitle}>Contatta {schoolName}</Text>
              <Text style={s.heroSub}>
                La scuola riceverà i tuoi contatti e ti risponderà via email.
              </Text>
            </View>

            <Label>Nome e cognome *</Label>
            <TextInput
              testID="lead-name"
              style={s.input}
              placeholder="Es. Mario Rossi"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />

            <Label>Email *</Label>
            <TextInput
              testID="lead-email"
              style={s.input}
              placeholder="email@esempio.it"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={120}
            />

            <Label>Telefono (opzionale)</Label>
            <TextInput
              testID="lead-phone"
              style={s.input}
              placeholder="+39 333 1234567"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={30}
            />

            <Label>Livello</Label>
            <View style={s.chipsRow}>
              {LEVELS.map((l) => {
                const active = level === l.key;
                return (
                  <TouchableOpacity
                    key={l.key}
                    onPress={() => setLevel(l.key)}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label>Stili di interesse</Label>
            <View style={s.chipsRow}>
              {STYLE_OPTIONS.map((st) => {
                const active = styles2.includes(st);
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => toggleStyle(st)}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label>Messaggio *</Label>
            <TextInput
              testID="lead-message"
              style={[s.input, s.textarea]}
              placeholder="Es. Sono interessato a iniziare un corso di bachata da gennaio..."
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={s.counter}>{message.length}/2000</Text>

            <TouchableOpacity
              testID="lead-submit"
              onPress={submit}
              disabled={busy || !user}
              activeOpacity={0.9}
              style={[s.submit, (busy || !user) && { opacity: 0.5 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={s.submitText}>Invia richiesta</Text>
                </>
              )}
            </TouchableOpacity>
            {!user ? (
              <Text style={s.warn}>Devi essere loggato per inviare la richiesta.</Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontWeight: "800", fontSize: 17 },
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,49,84,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "900", textAlign: "center" },
  heroSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: "center" },
  label: { color: "#fff", fontWeight: "800", fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.bgSecondary,
    color: "#fff",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  textarea: { minHeight: 110, paddingTop: 10 },
  counter: { color: colors.textMuted, fontSize: 11, textAlign: "right", marginTop: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    paddingVertical: 15,
    borderRadius: radii.pill,
    marginTop: spacing.xl,
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  warn: { color: colors.gold, textAlign: "center", marginTop: 10, fontSize: 12 },
});
