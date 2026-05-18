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

export default function EditEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [genre, setGenre] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [lineup, setLineup] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/events/${id}`);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setCity(data.city || "");
        setVenue(data.venue || "");
        setAddress(data.address || "");
        setGenre(data.genre || "");
        setImageUrl(data.image_url || "");
        setTicketUrl(data.ticket_url || "");
        setContactEmail(data.contact_email || "");
        setContactPhone(data.contact_phone || "");
        setLineup(Array.isArray(data.lineup) ? data.lineup.join(", ") : "");

        const isOwner = data.owner_id && user?.id === data.owner_id;
        const isAdmin = user?.role === "admin";
        if (!isOwner && !isAdmin) {
          Alert.alert("Accesso negato", "Solo il proprietario puo modificare questo evento.");
          router.back();
        }
      } catch (e: any) {
        Alert.alert("Errore", "Impossibile caricare l'evento");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onSave = async () => {
    if (!title.trim() || !description.trim() || !city.trim() || !venue.trim()) {
      Alert.alert("Campi obbligatori", "Titolo, descrizione, citta e locale sono richiesti.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        venue: venue.trim(),
        address: address.trim(),
        genre: genre.trim(),
        image_url: imageUrl.trim(),
        lineup: lineup.trim() ? lineup.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      if (ticketUrl.trim()) payload.ticket_url = ticketUrl.trim();
      if (contactEmail.trim()) payload.contact_email = contactEmail.trim();
      if (contactPhone.trim()) payload.contact_phone = contactPhone.trim();
      await api.patch(`/events/${id}`, payload);
      Alert.alert("✅ Salvato", "Le modifiche sono state salvate.", [
        { text: "OK", onPress: () => router.replace(`/event/${id}` as any) },
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
      <Stack.Screen
        options={{
          title: "Modifica evento",
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Field label="Titolo *" value={title} onChangeText={setTitle} testID="edit-title" />
            <Field label="Descrizione *" value={description} onChangeText={setDescription} multiline testID="edit-description" />
            <Field label="Citta *" value={city} onChangeText={setCity} />
            <Field label="Locale *" value={venue} onChangeText={setVenue} />
            <Field label="Indirizzo" value={address} onChangeText={setAddress} />
            <Field label="Genere (Salsa, Bachata...)" value={genre} onChangeText={setGenre} />
            <Field label="URL immagine" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
            <Field label="Lineup (separa con virgole)" value={lineup} onChangeText={setLineup} />
            <Field label="Link biglietti" value={ticketUrl} onChangeText={setTicketUrl} autoCapitalize="none" keyboardType="url" />
            <Field label="Email contatto" value={contactEmail} onChangeText={setContactEmail} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Telefono contatto" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />

            <TouchableOpacity
              testID="save-event-btn"
              style={s.saveBtn}
              onPress={onSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
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

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  autoCapitalize = "sentences",
  keyboardType = "default",
  testID,
}: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={[s.input, multiline && { minHeight: 96, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
      />
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
