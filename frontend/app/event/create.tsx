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
import { useI18n } from "../../src/i18n";

const ORGANIZER_TYPE_ICONS: Record<string, string> = {
  dj: "headset",
  gestore_locale: "business",
  promoter: "megaphone",
  festival: "musical-notes",
  scuola_ballo: "school",
  privato: "person",
};
const ORGANIZER_TYPE_KEYS = ["dj", "gestore_locale", "promoter", "festival", "scuola_ballo", "privato"];

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
  const { t } = useI18n();

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

  // image state (base64 data URL after resize) + URL fallback
  const [imageData, setImageData] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [pickingImage, setPickingImage] = useState(false);

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
    setPickingImage(true);
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
      setImageUrl("");
    } catch (e: any) {
      Alert.alert("Errore", "Impossibile caricare l'immagine");
    } finally {
      setPickingImage(false);
    }
  };

  const clearImage = () => {
    setImageData("");
    setImageUrl("");
  };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3 || description.trim().length < 10) {
      setError(t("events.fields.errors.titleDesc"));
      return;
    }
    if (!city.trim() || !venue.trim() || !address.trim()) {
      setError(t("events.fields.errors.location"));
      return;
    }
    if (!genre.trim()) {
      setError(t("events.fields.errors.genre"));
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
        image_url: imageData || (imageUrl.trim() ? (imageUrl.startsWith("http") ? imageUrl.trim() : `https://${imageUrl.trim()}`) : DEFAULT_IMAGE),
        organizer_type: organizerType,
        lineup: lineup
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (ticket.trim()) payload.ticket_url = ticket.trim();
      const r = await api.post("/events", payload);
      Alert.alert(
        t("events.fields.publishedTitle"),
        t("events.fields.publishedBody"),
        [
          { text: t("events.fields.publishedLater"), onPress: () => router.replace("/(tabs)/events") },
          { text: t("events.fields.publishedBoost"), onPress: () => router.replace(`/event/${r.data.id}`) },
        ]
      );
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || e.message || t("events.fields.errors.network"));
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
            <Text style={styles.kicker}>{t("common.optional") ? "NUOVO / NUEVO" : "NUOVO"}</Text>
            <Text style={styles.title}>{t("events.create")}</Text>
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
          <Text style={styles.lead}>{t("events.fields.lead")}</Text>

          {/* Tipo organizzatore */}
          <L t={t("events.fields.organizerType")} />
          <View style={styles.chipRow}>
            {ORGANIZER_TYPE_KEYS.map((key) => {
              const active = organizerType === key;
              const icon = ORGANIZER_TYPE_ICONS[key] || "person";
              const label = t(`events.organizerTypes.${key}`);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setOrganizerType(key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Ionicons
                    name={icon as any}
                    size={14}
                    color={active ? "#fff" : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <L t={`${t("events.fields.title")} *`} />
          <TextInput
            testID="ce-title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Latin Night Roma"
            placeholderTextColor={colors.textMuted}
          />

          <L t={`${t("events.fields.description")} *`} />
          <TextInput
            testID="ce-desc"
            style={[styles.input, { height: 110, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          {/* Generi - testo libero con virgole */}
          <L t={`${t("events.fields.genre")} *`} />
          <TextInput
            testID="ce-genre"
            style={styles.input}
            value={genre}
            onChangeText={setGenre}
            placeholder={t("events.fields.genrePlaceholder")}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>{t("events.fields.genreHint")}</Text>

          {/* Data */}
          <L t={`${t("events.fields.date")} *`} />
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
              <Text style={styles.pickerDoneText}>{t("events.fields.confirm")}</Text>
            </TouchableOpacity>
          )}

          {/* Orario Dalle / Alle */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <L t={`${t("events.fields.startTime")} *`} />
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
              <L t={`${t("events.fields.endTime")} *`} />
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
              <L t={t("events.fields.recentVenues")} />
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

          <L t={`${t("events.fields.city")} *`} />
          <TextInput
            testID="ce-city"
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Milano"
            placeholderTextColor={colors.textMuted}
          />

          <L t={`${t("events.fields.venue")} *`} />
          <TextInput
            testID="ce-venue"
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="Café Cubano"
            placeholderTextColor={colors.textMuted}
          />

          <L t={`${t("events.fields.address")} *`} />
          <TextInput
            testID="ce-address"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Via Roma 12"
            placeholderTextColor={colors.textMuted}
          />

          <L t={t("events.fields.lineup")} />
          <TextInput
            testID="ce-lineup"
            style={styles.input}
            value={lineup}
            onChangeText={setLineup}
            placeholder="DJ Mauro, La Reina, DJ Sol"
            placeholderTextColor={colors.textMuted}
          />

          {/* Locandina */}
          <L t={t("events.fields.image")} />
          {imageData ? (
            <View style={styles.picPreview} testID="ce-image-preview">
              <Image
                source={{ uri: imageData }}
                style={{ width: "100%", height: "100%", borderRadius: radii.md }}
                resizeMode="cover"
              />
              <TouchableOpacity onPress={clearImage} style={styles.picRemove} testID="ce-image-remove">
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={styles.picBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                <Text style={styles.picBadgeText}>{t("events.fields.imageUploaded")}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              testID="ce-image-pick"
              style={styles.picDropzone}
              onPress={pickImage}
              activeOpacity={0.8}
              disabled={pickingImage}
            >
              {pickingImage ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={colors.brand} />
                  <Text style={styles.picDropzoneTitle}>{t("events.fields.imageHint")}</Text>
                  <Text style={styles.picDropzoneDesc}>{t("events.fields.imageSubHint")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.orDivider}>{t("events.fields.imageOr")}</Text>

          <TextInput
            testID="ce-image-url"
            style={styles.input}
            value={imageUrl}
            onChangeText={(v) => {
              setImageUrl(v);
              if (v) setImageData("");
            }}
            placeholder={t("events.fields.imageUrlPlaceholder")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            editable={!imageData}
          />
          <Text style={styles.hint}>{t("events.fields.imageUrlHint")}</Text>

          <L t={t("events.fields.ticket")} />
          <TextInput
            testID="ce-ticket"
            style={styles.input}
            value={ticket}
            onChangeText={setTicket}
            placeholder={t("events.fields.ticketPlaceholder")}
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
                <Text style={styles.submitText}>{t("events.fields.publish")}</Text>
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
  picDropzone: {
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: radii.md,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236,72,153,0.05)",
    gap: 6,
  },
  picDropzoneTitle: { color: "#fff", fontWeight: "800", fontSize: 14, marginTop: 8 },
  picDropzoneDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  picPreview: {
    aspectRatio: 1,
    width: "100%",
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: "#111",
    position: "relative",
  },
  picRemove: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  picBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16,185,129,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  picBadgeText: { color: "#10B981", fontSize: 11, fontWeight: "800" },
  orDivider: {
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: 10,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
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
