import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/api";
import { colors, radii, spacing } from "../../../src/theme";
import { useAuth } from "../../../src/auth";

export default function EditDj() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [genres, setGenres] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [spotify, setSpotify] = useState("");
  const [tidal, setTidal] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/djs/${id}`);
        setName(data.name || "");
        setBio(data.bio || "");
        setCity(data.city || "");
        setGenres(Array.isArray(data.genres) ? data.genres.join(", ") : "");
        setImageUrl(data.image_url || "");
        setCoverUrl(data.cover_url || "");
        setInstagram(data.instagram || "");
        setSpotify(data.spotify_playlist_url || "");
        setTidal(data.tidal_playlist_url || "");

        const isOwner = data.owner_id && user?.id === data.owner_id;
        const isAdmin = user?.role === "admin";
        if (!isOwner && !isAdmin) {
          Alert.alert("Accesso negato", "Solo il proprietario puo modificare questo profilo DJ.");
          router.back();
        }
      } catch (e: any) {
        Alert.alert("Errore", "Impossibile caricare il profilo DJ");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onSave = async () => {
    if (!name.trim() || !bio.trim() || !city.trim()) {
      Alert.alert("Campi obbligatori", "Nome, bio e citta sono richiesti.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        bio: bio.trim(),
        city: city.trim(),
        genres: genres.trim() ? genres.split(",").map((s) => s.trim()).filter(Boolean) : [],
        image_url: imageUrl.trim(),
      };
      if (coverUrl.trim()) payload.cover_url = coverUrl.trim();
      if (instagram.trim()) payload.instagram = instagram.trim();
      if (spotify.trim()) payload.spotify_playlist_url = spotify.trim();
      if (tidal.trim()) payload.tidal_playlist_url = tidal.trim();
      await api.patch(`/djs/${id}`, payload);
      Alert.alert("✅ Salvato", "Modifiche salvate con successo.", [
        { text: "OK", onPress: () => router.replace(`/dj/${id}` as any) },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Errore durante il salvataggio";
      Alert.alert("Errore", String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Modifica DJ", headerStyle: { backgroundColor: colors.bg }, headerTintColor: "#fff", headerTitleStyle: { fontWeight: "800" } }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Field label="Nome DJ *" value={name} onChangeText={setName} />
            <Field label="Bio *" value={bio} onChangeText={setBio} multiline />
            <Field label="Citta *" value={city} onChangeText={setCity} />
            <Field label="Generi (Salsa, Bachata, Kizomba...)" value={genres} onChangeText={setGenres} />
            <Field label="URL foto profilo" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
            <Field label="URL copertina" value={coverUrl} onChangeText={setCoverUrl} autoCapitalize="none" />
            <Field label="Instagram (@username)" value={instagram} onChangeText={setInstagram} autoCapitalize="none" />
            <Field label="Spotify playlist URL" value={spotify} onChangeText={setSpotify} autoCapitalize="none" keyboardType="url" />
            <Field label="Tidal playlist URL" value={tidal} onChangeText={setTidal} autoCapitalize="none" keyboardType="url" />

            <TouchableOpacity testID="save-dj-btn" style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.saveText}>Salva modifiche</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
              <Text style={s.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, value, onChangeText, multiline = false, autoCapitalize = "sentences", keyboardType = "default" }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, multiline && { minHeight: 96, textAlignVertical: "top" }]} value={value} onChangeText={onChangeText} multiline={multiline} autoCapitalize={autoCapitalize} keyboardType={keyboardType} placeholderTextColor={colors.textMuted} />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" },
  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 15 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.brand, borderRadius: radii.pill, paddingVertical: 16, marginTop: spacing.md, minHeight: 52 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cancelBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  cancelText: { color: colors.textSecondary, fontWeight: "700" },
});
