import React, { useState, useEffect, useCallback } from "react";
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api, formatApiError } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

const ORGANIZER_TYPES: { key: string; label: string; icon: string }[] = [
  { key: "dj", label: "DJ", icon: "headset" },
  { key: "gestore_locale", label: "Gestore locale", icon: "business" },
  { key: "promoter", label: "Promoter", icon: "megaphone" },
  { key: "festival", label: "Festival", icon: "musical-notes" },
  { key: "scuola_ballo", label: "Scuola di ballo", icon: "school" },
  { key: "privato", label: "Privato", icon: "person" },
];

const DEFAULT_IMAGE = "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg";

type Venue = { venue: string; city: string; address: string; count: number };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateTime(date: Date, time: Date): Date {
  const out = new Date(date);
  out.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return out;
}

export default function CreateEvent() {
  const router = useRouter();

  // form state
  const [organizerType, setOrganizerType] = useState<string>("dj");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [genre, setGenre] = useState("");
  const [lineup, setLineup] = useState("");
  const [ticket, setTicket] = useState("");

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setHours(22, 0, 0, 0);
  const defaultEnd = new Date(today);
  defaultEnd.setHours(4, 0, 0, 0);
  defaultEnd.setDate(defaultEnd.getDate() + 1);

  const [eventDate, setEventDate] = useState<Date>(today);
  const [startTime, setStartTime] = useState<Date>(defaultStart);
  const [endTime, setEndTime] = useState<Date>(defaultEnd);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // image state (base64 data URL after resize)
  const [imageData, setImageData] = useState<string>("");

  // recent venues for autocomplete
  const [recentVenues, setRecentVenues] = useState<Venue[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load my recent venues
  const loadVenues = useCallback(async () => {
    try {
      const r = await api.get<Venue[]>("/events/my/venues");
      setRecentVenues(r.data || []);
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const useRecentVenue = (v: Venue) => {
    setVenue(v.venue);
    setCity(v.city);
    setAddress(v.address);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permesso negato", "Concedi accesso alla galleria foto");
        return;
      }
      // Crop quadrato 1:1 (formato post Instagram) + qualità 0.6 per file ~300KB
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      setImageData(`data:image/jpeg;base64,${result.assets[0].base64}`);
    } catch (e: any) {
      Alert.alert("Errore", "Impossibile caricare l'immagine");
    }
  };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3 || description.trim().length < 10) {
      setError("Titolo (min 3) e descrizione (min 10) obbligatori");
      return;
    }
    if (!city.trim() || !venue.trim() || !address.trim()) {
      setError("Città, locale e indirizzo obbligatori");
      return;
    }
    if (!genre.trim()) {
      setError("Inserisci almeno un genere");
      return;
    }
    if (endTime.getTime() <= startTime.getTime()) {
      // se l'orario "Alle" è uguale o prima dell'ora "Dalle" -> presumiamo notte (giorno dopo)
      const adjusted = new Date(endTime);
      adjusted.setDate(adjusted.getDate() + 1);
      setEndTime(adjusted);
    }

    const startDateTime = combineDateTime(eventDate, startTime);
    let endDateTime = combineDateTime(eventDate, endTime);
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      endDateTime = new Date(endDateTime);
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        venue: venue.trim(),
        address: address.trim(),
        genre: genre.trim(),
        date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        image_url: imageData || DEFAULT_IMAGE,
        organizer_type: organizerType,
        lineup: lineup
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (ticket.trim()) payload.ticket_url = ticket.trim();
      const r = await api.post("/events", payload);
      Alert.alert(
        "Evento pubblicato!",
        "Il tuo evento è online. Vuoi promuoverlo subito con BOOST?",
        [
          { text: "Più tardi", onPress: () => router.replace("/(tabs)/events") },
          { text: "Promuovi ora", onPress: () => router.replace(`/event/${r.data.id}`) },
        ]
      );
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || e.message || "Errore di rete");
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
            Pubblica la tua serata latina. Dopo la pubblicazione puoi promuoverla con BOOST (da 4,99 €)
            per apparire in cima alla lista.
          </Text>

          {/* Tipo organizzatore */}
          <L t="Tipo organizzatore *" />
          <View style={styles.chipRow}>
            {ORGANIZER_TYPES.map((o) => {
              const active = organizerType === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => setOrganizerType(o.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Ionicons
                    name={o.icon as any}
                    size={14}
                    color={active ? "#fff" : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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

          {/* Generi - testo libero con virgole */}
          <L t="Generi musicali *" />
          <TextInput
            testID="ce-genre"
            style={styles.input}
            value={genre}
            onChangeText={setGenre}
            placeholder="Es. Bachata, Salsa, Reggaeton, Kizomba"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>Separa i generi con una virgola</Text>

          {/* Data */}
          <L t="Data evento *" />
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <Text style={{ color: "#fff", fontSize: 14 }}>{formatDate(eventDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS !== "ios") setShowDatePicker(false);
                if (d) setEventDate(d);
              }}
              themeVariant="dark"
            />
          )}
          {Platform.OS === "ios" && showDatePicker && (
            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerDone}>
              <Text style={styles.pickerDoneText}>Conferma</Text>
            </TouchableOpacity>
          )}

          {/* Orario Dalle / Alle */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <L t="Dalle *" />
              <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)} activeOpacity={0.7}>
                <Text style={{ color: "#fff", fontSize: 14 }}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    if (Platform.OS !== "ios") setShowStartPicker(false);
                    if (d) setStartTime(d);
                  }}
                  themeVariant="dark"
                />
              )}
              {Platform.OS === "ios" && showStartPicker && (
                <TouchableOpacity onPress={() => setShowStartPicker(false)} style={styles.pickerDone}>
                  <Text style={styles.pickerDoneText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <L t="Alle *" />
              <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)} activeOpacity={0.7}>
                <Text style={{ color: "#fff", fontSize: 14 }}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    if (Platform.OS !== "ios") setShowEndPicker(false);
                    if (d) setEndTime(d);
                  }}
                  themeVariant="dark"
                />
              )}
              {Platform.OS === "ios" && showEndPicker && (
                <TouchableOpacity onPress={() => setShowEndPicker(false)} style={styles.pickerDone}>
                  <Text style={styles.pickerDoneText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Locali frequenti (autocomplete) */}
          {recentVenues.length > 0 && (
            <>
              <L t="I tuoi locali frequenti" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {recentVenues.map((v, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recentVenue}
                    onPress={() => useRecentVenue(v)}
                  >
                    <Ionicons name="bookmark" size={12} color={colors.brand} />
                    <Text style={styles.recentVenueText} numberOfLines={1}>
                      {v.venue}
                    </Text>
                    <Text style={styles.recentVenueCount}>×{v.count}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <L t="Città *" />
          <TextInput
            testID="ce-city"
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Milano"
            placeholderTextColor={colors.textMuted}
          />

          <L t="Nome locale *" />
          <TextInput
            testID="ce-venue"
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="Café Cubano"
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

          <L t="Line-up DJ (separati da virgola)" />
          <TextInput
            testID="ce-lineup"
            style={styles.input}
            value={lineup}
            onChangeText={setLineup}
            placeholder="DJ Mauro, La Reina, DJ Sol"
            placeholderTextColor={colors.textMuted}
          />

          {/* Locandina */}
          <L t="Locandina evento (1080×1080 - quadrato Instagram)" />
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.85}>
            {imageData ? (
              <Image source={{ uri: imageData }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image" size={42} color={colors.textMuted} />
                <Text style={styles.imageHint}>Tocca per caricare la locandina</Text>
                <Text style={styles.imageHintSmall}>Formato consigliato: post Instagram quadrato</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageData && (
            <TouchableOpacity onPress={() => setImageData("")} style={styles.removeImage}>
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={styles.removeImageText}>Rimuovi locandina</Text>
            </TouchableOpacity>
          )}

          <L t="Link biglietteria (URL)" />
          <TextInput
            testID="ce-ticket"
            style={styles.input}
            value={ticket}
            onChangeText={setTicket}
            placeholder="https://eventbrite.com/... (opzionale)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />

          {error ? (
            <Text style={styles.error} testID="ce-error">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            testID="ce-submit"
            style={[styles.submit, submitting && { opacity: 0.6 }]}
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
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
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
    minHeight: 44,
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  imagePicker: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    aspectRatio: 1,
    width: "100%",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  imageHint: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
  imageHintSmall: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  removeImage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "center",
  },
  removeImageText: { color: colors.error, fontSize: 12, fontWeight: "600" },
  recentVenue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentVenueText: { color: "#fff", fontSize: 12, fontWeight: "600", maxWidth: 140 },
  recentVenueCount: { color: colors.brand, fontSize: 10, fontWeight: "800" },
  pickerDone: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginTop: 6,
  },
  pickerDoneText: { color: "#fff", fontWeight: "700", fontSize: 12 },
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
