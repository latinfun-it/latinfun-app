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

const ALL_STYLES = ["bachata", "salsa", "reggaeton", "kizomba", "rueda", "cha-cha", "dembow", "urban"];
const ALL_LEVELS = ["principianti", "intermedio", "avanzato"];

const DEFAULT_IMAGE = "https://images.pexels.com/photos/1540338/pexels-photo-1540338.jpeg";

export default function RegisterSchool() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [styles_, setStyles] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permesso necessario",
          "Consenti l'accesso alle foto per caricare la copertina."
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      if (!a.base64) {
        Alert.alert("Errore", "Impossibile leggere il file");
        return;
      }
      const size = Math.round((a.base64.length * 3) / 4 / 1024);
      if (size > 2500) {
        Alert.alert(
          "File troppo grande",
          `La foto e ${(size / 1024).toFixed(1)} MB. Scegli una foto piu leggera (max ~2.5 MB) o ritagliala.`
        );
        return;
      }
      const mime = a.mimeType || "image/jpeg";
      setImageBase64(`data:${mime};base64,${a.base64}`);
      setImageUrl(""); // priorità a file caricato
    } catch (e: any) {
      Alert.alert("Errore", e?.message || "Impossibile aprire la galleria");
    } finally {
      setPickingImage(false);
    }
  };

  const clearImage = () => {
    setImageBase64(null);
    setImageUrl("");
  };

  const toggle = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const submit = async () => {
    setError(null);
    if (!name || !city || !address || bio.length < 10) {
      setError("Compila nome, citta, indirizzo e una bio di almeno 10 caratteri");
      return;
    }
    if (styles_.length === 0) {
      setError("Seleziona almeno uno stile di ballo");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        name,
        city,
        address,
        bio,
        image_url: imageBase64 || imageUrl.trim() || DEFAULT_IMAGE,
        styles: styles_,
        levels,
      };
      if (phone) payload.phone = phone;
      if (email) payload.email = email;
      if (website) payload.website = website.startsWith("http") ? website : `https://${website}`;
      if (instagram) payload.instagram = instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`;

      const r = await api.post("/schools", payload);
      Alert.alert(
        "Scuola registrata!",
        "La tua scuola e ora visibile nell'app. Condividila con i tuoi studenti per farla crescere.",
        [{ text: "Vai alla scuola", onPress: () => router.replace(`/school/${r.data.id}`) }]
      );
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || "Errore durante la registrazione");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="register-school-screen">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="register-school-back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PER MAESTRI E PROMOTER</Text>
            <Text style={styles.title}>Registra la tua scuola</Text>
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
            Fai conoscere la tua academia a migliaia di appassionati latini in tutta Italia.
            Aggiungi info, corsi e contatti in 2 minuti.
          </Text>

          <Label text="Nome scuola *" />
          <TextInput
            testID="input-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Es. Academia Salsa Milano"
            placeholderTextColor={colors.textMuted}
          />

          <Label text="Citta *" />
          <TextInput
            testID="input-city"
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Es. Milano"
            placeholderTextColor={colors.textMuted}
          />

          <Label text="Indirizzo *" />
          <TextInput
            testID="input-address"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Es. Via Padova 112"
            placeholderTextColor={colors.textMuted}
          />

          <Label text="Descrizione *" />
          <TextInput
            testID="input-bio"
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Racconta la tua scuola, i maestri, cosa vi rende unici"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Label text="Stili di ballo *" />
          <View style={styles.chipRow}>
            {ALL_STYLES.map((s) => {
              const active = styles_.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  testID={`style-${s}`}
                  onPress={() => toggle(styles_, s, setStyles)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Label text="Livelli" />
          <View style={styles.chipRow}>
            {ALL_LEVELS.map((l) => {
              const active = levels.includes(l);
              return (
                <TouchableOpacity
                  key={l}
                  testID={`level-${l}`}
                  onPress={() => toggle(levels, l, setLevels)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Label text="Telefono" />
          <TextInput
            testID="input-phone"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+39..."
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />

          <Label text="Email" />
          <TextInput
            testID="input-email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="info@tuascuola.it"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Label text="Sito web" />
          <TextInput
            testID="input-website"
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="tuascuola.it"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <Label text="Instagram" />
          <TextInput
            testID="input-instagram"
            style={styles.input}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="@tuascuola"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <Label text="Immagine di copertina" />
          {imageBase64 ? (
            <View style={styles.picPreview} testID="school-image-preview">
              <Image
                source={{ uri: imageBase64 }}
                style={{ width: "100%", height: "100%", borderRadius: radii.md }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={clearImage}
                style={styles.picRemove}
                testID="school-image-remove"
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={styles.picBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                <Text style={styles.picBadgeText}>File caricato</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              testID="school-image-pick"
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
                    Tocca per scegliere dalla galleria. Ritaglio consigliato 16:9.
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.orDivider}>— oppure —</Text>

          <TextInput
            testID="input-image"
            style={styles.input}
            value={imageUrl}
            onChangeText={(v) => {
              setImageUrl(v);
              if (v) setImageBase64(null);
            }}
            placeholder="Incolla un link https://... (opzionale)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            editable={!imageBase64}
          />
          <Text style={styles.hint}>
            Puoi caricare un file o incollare un URL. Se lasci vuoto useremo l&apos;immagine di default.
          </Text>

          {error ? (
            <Text style={styles.error} testID="register-school-error">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            testID="submit-school"
            style={styles.submitBtn}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitText}>Pubblica la scuola</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
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
  lead: { color: colors.textSecondary, marginBottom: 20, fontSize: 13, lineHeight: 20 },
  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 14,
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
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  picDropzone: {
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: radii.md,
    paddingVertical: 28,
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
    height: 180,
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginTop: 24,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
