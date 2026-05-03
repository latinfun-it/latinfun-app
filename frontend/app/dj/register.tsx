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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, formatApiError } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

const ALL_GENRES = ["bachata", "reggaeton", "salsa", "latin", "kizomba", "urban"];
const DEFAULT_IMAGE = "https://images.pexels.com/photos/1540338/pexels-photo-1540338.jpeg";

export default function RegisterDJ() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [spotify, setSpotify] = useState("");
  const [tidal, setTidal] = useState("");
  const [image, setImage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pickingImage, setPickingImage] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permesso negato", "Concedi accesso alla galleria foto");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setImageUrl("");
    } catch {
      Alert.alert("Errore", "Impossibile caricare l'immagine");
    } finally {
      setPickingImage(false);
    }
  };

  const clearImage = () => {
    setImage("");
    setImageUrl("");
  };

  const toggle = (g: string) =>
    setGenres((arr) => (arr.includes(g) ? arr.filter((x) => x !== g) : [...arr, g]));

  const submit = async () => {
    setError(null);
    if (!name || !city || bio.length < 10) {
      setError("Nome, citta e bio (min 10 caratteri) sono obbligatori");
      return;
    }
    if (genres.length === 0) {
      setError("Seleziona almeno un genere");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        name,
        city,
        bio,
        genres,
        image_url: image.trim() || (imageUrl.trim() ? (imageUrl.startsWith("http") ? imageUrl.trim() : `https://${imageUrl.trim()}`) : DEFAULT_IMAGE),
      };
      if (instagram)
        payload.instagram = instagram.startsWith("http")
          ? instagram
          : `https://instagram.com/${instagram.replace(/^@/, "")}`;
      if (spotify) {
        const m = spotify.match(/playlist\/([A-Za-z0-9]+)/);
        if (m) payload.spotify_playlist_url = `https://open.spotify.com/embed/playlist/${m[1]}`;
        else payload.spotify_playlist_url = spotify;
      }
      if (tidal) payload.tidal_playlist_url = tidal;
      const r = await api.post("/djs", payload);
      Alert.alert(
        "Profilo DJ pubblicato!",
        "Il tuo profilo e ora visibile nell'app. Presto potrai acquistare banner promozionali per apparire in evidenza.",
        [{ text: "Vai al profilo", onPress: () => router.replace(`/dj/${r.data.id}`) }]
      );
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="register-dj-screen">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="dj-reg-back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PER DJ E ARTISTI</Text>
            <Text style={styles.title}>Registra il tuo profilo DJ</Text>
          </View>
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Crea la tua pagina artista gratis. Presto potrai acquistare banner promozionali e apparire in evidenza tra i DJ italiani.
          </Text>

          <L t="Nome d'arte *" />
          <TextInput testID="dj-name" style={styles.input} value={name} onChangeText={setName} placeholder="Es. DJ Caliente" placeholderTextColor={colors.textMuted} />

          <L t="Citta *" />
          <TextInput testID="dj-city" style={styles.input} value={city} onChangeText={setCity} placeholder="Es. Milano" placeholderTextColor={colors.textMuted} />

          <L t="Bio *" />
          <TextInput testID="dj-bio" style={[styles.input, { height: 100, textAlignVertical: "top" }]} value={bio} onChangeText={setBio} placeholder="Racconta il tuo stile, le tue residenze, cosa ti rende unico" placeholderTextColor={colors.textMuted} multiline />

          <L t="Generi *" />
          <View style={styles.chipRow}>
            {ALL_GENRES.map((g) => {
              const active = genres.includes(g);
              return (
                <TouchableOpacity key={g} testID={`dj-genre-${g}`} onPress={() => toggle(g)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <L t="Instagram" />
          <TextInput testID="dj-ig" style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="@tuohandle" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

          <L t="Playlist Spotify (URL)" />
          <TextInput testID="dj-spotify" style={styles.input} value={spotify} onChangeText={setSpotify} placeholder="https://open.spotify.com/playlist/..." placeholderTextColor={colors.textMuted} autoCapitalize="none" />

          <L t="Playlist Tidal (URL)" />
          <TextInput testID="dj-tidal" style={styles.input} value={tidal} onChangeText={setTidal} placeholder="https://tidal.com/..." placeholderTextColor={colors.textMuted} autoCapitalize="none" />

          <L t="Foto profilo (JPG/PNG)" />
          {image ? (
            <View style={styles.picPreview} testID="dj-image-preview">
              <Image
                source={{ uri: image }}
                style={{ width: "100%", height: "100%", borderRadius: radii.md }}
                resizeMode="cover"
              />
              <TouchableOpacity onPress={clearImage} style={styles.picRemove} testID="dj-image-remove">
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={styles.picBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                <Text style={styles.picBadgeText}>File caricato</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              testID="dj-image-pick"
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
                  <Text style={styles.picDropzoneTitle}>Carica una foto (JPG/PNG)</Text>
                  <Text style={styles.picDropzoneDesc}>
                    Tocca per scegliere dalla galleria. Ritaglio 1:1 (Instagram).
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.orDivider}>— oppure —</Text>

          <TextInput
            testID="dj-image-url"
            style={styles.input}
            value={imageUrl}
            onChangeText={(v) => {
              setImageUrl(v);
              if (v) setImage("");
            }}
            placeholder="Incolla un link https://... (opzionale)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            editable={!image}
          />
          <Text style={styles.hint}>
            Puoi caricare un file o incollare un URL. Se lasci vuoto useremo l&apos;immagine di default.
          </Text>

          {error ? <Text style={styles.error} testID="dj-reg-error">{error}</Text> : null}

          <TouchableOpacity testID="dj-reg-submit" style={styles.submitBtn} onPress={submit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitText}>Pubblica profilo DJ</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function L({ t }: { t: string }) { return <Text style={styles.label}>{t}</Text>; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  lead: { color: colors.textSecondary, marginBottom: 16, fontSize: 13, lineHeight: 20 },
  label: { color: "#fff", fontWeight: "700", fontSize: 12, marginBottom: 8, marginTop: 14, letterSpacing: 0.5 },
  input: { backgroundColor: colors.bgSecondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.bgTertiary, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
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
  picDropzoneDesc: { color: colors.textSecondary, fontSize: 12, textAlign: "center", marginTop: 2 },
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
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  imageHint: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 12 },
  imageHintSmall: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  removeImage: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "center" },
  removeImageText: { color: colors.error, fontSize: 12, fontWeight: "600" },
  error: { color: colors.error, marginTop: 14, fontSize: 13 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.brand, borderRadius: radii.pill, paddingVertical: 16, marginTop: 22 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
