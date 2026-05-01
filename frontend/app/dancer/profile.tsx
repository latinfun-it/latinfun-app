import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";
import BrandHeader from "../../src/BrandHeader";

const STYLES = ["bachata", "salsa", "kizomba", "reggaeton", "merengue", "cha cha"];
const LEVELS = ["principiante", "intermedio", "avanzato", "pro"];
const LOOKING = ["pratica", "social", "competizione", "amicizia"];

export default function DancerProfileEditor() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [styles_, setStyles] = useState<string[]>([]);
  const [level, setLevel] = useState("intermedio");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/dancer/profile/me");
      const p = r.data as any;
      if (p) {
        setDisplayName(p.display_name || "");
        setBio(p.bio || "");
        setCity(p.city || "");
        setAge(p.age ? String(p.age) : "");
        setPhotoUrl(p.photo_url || "");
        setStyles(p.styles || []);
        setLevel(p.level || "intermedio");
        setLookingFor(p.looking_for || []);
        setInstagram(p.instagram || "");
      } else if (user) {
        setDisplayName(user.name || "");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.5,
        base64: true,
      });
      if (!r.canceled && r.assets[0]?.base64) {
        setPhotoUrl(`data:image/jpeg;base64,${r.assets[0].base64}`);
      }
    } catch {
      /* silent */
    }
  };

  const save = async () => {
    if (!displayName.trim() || !city.trim() || !photoUrl) {
      const m = "Nome, città e foto sono obbligatori";
      if (Platform.OS === "web") alert(m);
      else Alert.alert("Mancano dati", m);
      return;
    }
    setSaving(true);
    try {
      await api.post("/dancer/profile", {
        display_name: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        age: age ? parseInt(age, 10) : null,
        photo_url: photoUrl,
        styles: styles_,
        level,
        looking_for: lookingFor,
        instagram: instagram.trim() || null,
      });
      router.back();
    } catch (e: any) {
      const m = e?.response?.data?.detail || "Errore durante il salvataggio";
      if (Platform.OS === "web") alert(m);
      else Alert.alert("Errore", m);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[ss.center, { flex: 1, backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BrandHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={ss.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={ss.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={ss.kicker}>PROFILO BALLERINO</Text>
              <Text style={ss.title}>Il tuo profilo</Text>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={ss.label}>FOTO PRINCIPALE *</Text>
            <TouchableOpacity onPress={pickPhoto} style={ss.photoWrap}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={ss.photo} />
              ) : (
                <View style={[ss.photo, ss.photoPlaceholder]}>
                  <Ionicons name="camera" size={36} color={colors.brand} />
                  <Text style={ss.dim}>Scegli foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={ss.label}>NOME O NICKNAME *</Text>
            <TextInput
              testID="dn-name"
              style={ss.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Es. Mauro"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />

            <Text style={ss.label}>CITTÀ *</Text>
            <TextInput
              testID="dn-city"
              style={ss.input}
              value={city}
              onChangeText={setCity}
              placeholder="Es. Roma"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />

            <Text style={ss.label}>ETÀ (opzionale)</Text>
            <TextInput
              testID="dn-age"
              style={ss.input}
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
              placeholder="Es. 28"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={ss.label}>BIO</Text>
            <TextInput
              testID="dn-bio"
              style={[ss.input, { height: 90, textAlignVertical: "top" }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Raccontaci di te e di come balli..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={600}
            />

            <Text style={ss.label}>STILI</Text>
            <View style={ss.chipsRow}>
              {STYLES.map((s) => {
                const on = styles_.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => toggle(styles_, s, setStyles)}
                    style={[ss.chip, on && ss.chipOn]}
                  >
                    <Text style={[ss.chipText, on && ss.chipTextOn]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={ss.label}>LIVELLO</Text>
            <View style={ss.chipsRow}>
              {LEVELS.map((l) => {
                const on = level === l;
                return (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setLevel(l)}
                    style={[ss.chip, on && ss.chipOn]}
                  >
                    <Text style={[ss.chipText, on && ss.chipTextOn]}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={ss.label}>CERCO PER</Text>
            <View style={ss.chipsRow}>
              {LOOKING.map((l) => {
                const on = lookingFor.includes(l);
                return (
                  <TouchableOpacity
                    key={l}
                    onPress={() => toggle(lookingFor, l, setLookingFor)}
                    style={[ss.chip, on && ss.chipOn]}
                  >
                    <Text style={[ss.chipText, on && ss.chipTextOn]}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={ss.label}>INSTAGRAM (opzionale)</Text>
            <TextInput
              testID="dn-ig"
              style={ss.input}
              value={instagram}
              onChangeText={setInstagram}
              placeholder="@tuonome"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              testID="dn-save"
              style={[ss.saveBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={ss.saveText}>Salva profilo</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const ss = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  label: { color: colors.brand, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.sm,
    color: "#fff", padding: 12, fontSize: 14,
  },
  photoWrap: { alignItems: "center" },
  photo: { width: 200, height: 240, borderRadius: radii.md, backgroundColor: colors.bgSecondary },
  photoPlaceholder: {
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
  },
  dim: { color: colors.textMuted, fontSize: 12 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
  chipTextOn: { color: "#fff" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14, borderRadius: radii.pill,
    marginTop: 28,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
