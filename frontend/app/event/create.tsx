import React, { useState } from "react";
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
import { api, formatApiError } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

const GENRES = ["bachata", "reggaeton", "salsa", "latin", "kizomba", "urban"];
const DEFAULT_IMAGE = "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg";

function toISO(dateStr: string, timeStr: string): string | null {
  // dateStr: "DD/MM/YYYY", timeStr: "HH:mm"
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !t) return null;
  const [, dd, mm, yyyy] = m;
  const [, hh, min] = t;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${min}:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CreateEvent() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [genre, setGenre] = useState("latin");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("22:00");
  const [image, setImage] = useState("");
  const [ticket, setTicket] = useState("");
  const [lineup, setLineup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3 || description.trim().length < 10) {
      setError("Titolo (min 3) e descrizione (min 10) obbligatori");
      return;
    }
    if (!city || !venue || !address) {
      setError("Citta, locale e indirizzo obbligatori");
      return;
    }
    const iso = toISO(date.trim(), time.trim());
    if (!iso) {
      setError("Data/ora non valide. Formato: GG/MM/AAAA HH:mm");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        venue: venue.trim(),
        address: address.trim(),
        genre,
        date: iso,
        image_url: image.trim() || DEFAULT_IMAGE,
        lineup: lineup
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (ticket.trim()) payload.ticket_url = ticket.trim();
      const r = await api.post("/events", payload);
      Alert.alert(
        "Evento pubblicato!",
        "Il tuo evento e online. Vuoi promuoverlo subito con BOOST?",
        [
          { text: "Piu tardi", onPress: () => router.replace("/(tabs)/events") },
          { text: "Promuovi ora", onPress: () => router.replace(`/event/${r.data.id}`) },
        ]
      );
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="create-event">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="ce-back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>NUOVO</Text>
            <Text style={styles.title}>Crea evento</Text>
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
          <Text style={styles.lead}>
            Pubblica la tua serata latina. Dopo la pubblicazione puoi promuoverla con BOOST (da 4,99 EUR)
            per apparire in cima alla lista.
          </Text>

          <L t="Titolo *" />
          <TextInput
            testID="ce-title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Es. Latin Night Roma"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Descrizione *" />
          <TextInput
            testID="ce-desc"
            style={[styles.input, { height: 110, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Atmosfera, artisti, dress code..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <L t="Genere *" />
          <View style={styles.chipRow}>
            {GENRES.map((g) => {
              const active = genre === g;
              return (
                <TouchableOpacity
                  key={g}
                  testID={`ce-genre-${g}`}
                  onPress={() => setGenre(g)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <L t="Data *" />
          <TextInput
            testID="ce-date"
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="GG/MM/AAAA (es. 15/03/2026)"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Orario *" />
          <TextInput
            testID="ce-time"
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="HH:mm (es. 22:00)"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Citta *" />
          <TextInput
            testID="ce-city"
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Milano"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Locale *" />
          <TextInput
            testID="ce-venue"
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="Cafe Cubano"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Indirizzo *" />
          <TextInput
            testID="ce-address"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Via Roma 12, Milano"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Line-up (separati da virgola)" />
          <TextInput
            testID="ce-lineup"
            style={styles.input}
            value={lineup}
            onChangeText={setLineup}
            placeholder="DJ Mauro, La Reina, DJ Sol"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Immagine di copertina (URL)" />
          <TextInput
            testID="ce-image"
            style={styles.input}
            value={image}
            onChangeText={setImage}
            placeholder="https://... (opzionale)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <L t="Link biglietti (URL)" />
          <TextInput
            testID="ce-ticket"
            style={styles.input}
            value={ticket}
            onChangeText={setTicket}
            placeholder="https://... (opzionale)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          {error ? (
            <Text style={styles.error} testID="ce-error">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            testID="ce-submit"
            style={styles.submit}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="megaphone" size={18} color="#fff" />
                <Text style={styles.submitText}>Pubblica evento</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function L({ t }: { t: string }) {
  return <Text style={styles.label}>{t}</Text>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  lead: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  error: { color: colors.error, marginTop: 14, fontSize: 13 },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginTop: 22,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
