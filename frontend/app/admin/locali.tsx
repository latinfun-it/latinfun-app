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
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";
import BrandHeader from "../../src/BrandHeader";
import type { Locale } from "../../src/types";

const CATEGORIES = [
  { key: "ristorante", label: "Ristorante" },
  { key: "bar", label: "Bar" },
  { key: "lounge", label: "Lounge" },
  { key: "discoteca_cena", label: "Disco-Cena" },
  { key: "altro", label: "Altro" },
];
const PRICE_RANGES = ["€", "€€", "€€€", "€€€€"];

type Form = {
  id?: string;
  name: string;
  category: string;
  cuisine: string;
  city: string;
  address: string;
  bio: string;
  image_url: string;
  cover_url: string;
  price_range: string;
  hours: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
};

const emptyForm: Form = {
  name: "",
  category: "ristorante",
  cuisine: "",
  city: "",
  address: "",
  bio: "",
  image_url: "",
  cover_url: "",
  price_range: "€€",
  hours: "",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
};

async function pickImageBase64(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permesso negato", "Serve l'accesso alla galleria per scegliere una foto.");
    return null;
  }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    base64: true,
    allowsEditing: true,
  });
  if (r.canceled || !r.assets?.[0]?.base64) return null;
  return `data:image/jpeg;base64,${r.assets[0].base64}`;
}

export default function AdminLocali() {
  const router = useRouter();
  const { user } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [list, setList] = useState<Locale[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Locale[]>("/locali");
      setList(r.data);
    } catch {
      setList([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (edit && list.length > 0) {
      const loc = list.find((l) => l.id === edit);
      if (loc) {
        setForm({
          id: loc.id,
          name: loc.name,
          category: loc.category,
          cuisine: loc.cuisine,
          city: loc.city,
          address: loc.address,
          bio: loc.bio,
          image_url: loc.image_url,
          cover_url: loc.cover_url || "",
          price_range: loc.price_range || "€€",
          hours: loc.hours || "",
          phone: loc.phone || "",
          email: loc.email || "",
          website: loc.website || "",
          instagram: loc.instagram || "",
          facebook: loc.facebook || "",
        });
        setShowForm(true);
      }
    }
  }, [edit, list]);

  if (user?.role !== "admin") {
    return (
      <View style={[styles.fill, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={{ color: "#fff", fontSize: 16 }}>Area riservata all'admin</Text>
      </View>
    );
  }

  const save = async () => {
    if (!form.name || !form.city || !form.address || !form.bio || !form.image_url || !form.cuisine) {
      Alert.alert("Campi mancanti", "Compila almeno Nome, Cucina, Città, Indirizzo, Descrizione e Foto.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: form.name,
        category: form.category,
        cuisine: form.cuisine,
        city: form.city,
        address: form.address,
        bio: form.bio,
        image_url: form.image_url,
        cover_url: form.cover_url || undefined,
        price_range: form.price_range || undefined,
        hours: form.hours || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
      };
      if (form.id) {
        await api.patch(`/locali/${form.id}`, body);
      } else {
        await api.post("/locali?force=true", body);
      }
      setForm(emptyForm);
      setShowForm(false);
      await load();
      Alert.alert("Successo", form.id ? "Locale aggiornato" : "Locale creato");
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail?.message || e?.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    const ok = Platform.OS === "web"
      ? window.confirm(`Eliminare definitivamente "${name}"?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert("Conferma", `Eliminare "${name}"?`, [
            { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
            { text: "Elimina", style: "destructive", onPress: () => resolve(true) },
          ]);
        });
    if (!ok) return;
    try {
      await api.delete(`/locali/${id}`);
      await load();
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    }
  };

  return (
    <View style={styles.fill}>
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="admin-locali-back">
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Gestione Locali</Text>
          <TouchableOpacity
            testID="add-locale-btn"
            style={styles.addBtn}
            onPress={() => { setForm(emptyForm); setShowForm(true); }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
            {showForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{form.id ? "Modifica locale" : "Nuovo locale"}</Text>

                <ImagePickerRow
                  label="Foto principale (logo) *"
                  value={form.image_url}
                  onPick={async () => {
                    const u = await pickImageBase64();
                    if (u) setForm({ ...form, image_url: u });
                  }}
                />
                <ImagePickerRow
                  label="Foto copertina (opzionale)"
                  value={form.cover_url}
                  onPick={async () => {
                    const u = await pickImageBase64();
                    if (u) setForm({ ...form, cover_url: u });
                  }}
                />

                <Field label="Nome locale *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />

                <Text style={styles.label}>Categoria *</Text>
                <View style={styles.pillsWrap}>
                  {CATEGORIES.map((c) => {
                    const active = form.category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => setForm({ ...form, category: c.key })}
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Field
                  label="Tipo di cucina (testo libero) *"
                  placeholder="Es: Cubana · Mix Caribe + Italiana · Fusion latino-asiatica..."
                  value={form.cuisine}
                  onChange={(v) => setForm({ ...form, cuisine: v })}
                />
                <Field label="Città *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Indirizzo *" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                <Field label="Descrizione *" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} multiline />

                <Text style={styles.label}>Fascia prezzo</Text>
                <View style={styles.pillsWrap}>
                  {PRICE_RANGES.map((p) => {
                    const active = form.price_range === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setForm({ ...form, price_range: p })}
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Field
                  label="Orari apertura"
                  placeholder="Es: Mar-Dom 19:00-02:00"
                  value={form.hours}
                  onChange={(v) => setForm({ ...form, hours: v })}
                />
                <Field label="Telefono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} kbd="phone-pad" />
                <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} kbd="email-address" />
                <Field label="Sito web" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
                <Field label="Instagram (@handle o URL)" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
                <Field label="Facebook (URL)" value={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} />

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    testID="save-locale"
                    onPress={save}
                    disabled={saving}
                    style={[styles.cta, { flex: 1 }]}
                  >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{form.id ? "Aggiorna" : "Crea locale"}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setShowForm(false); setForm(emptyForm); }}
                    style={[styles.ctaSecondary, { flex: 0.5 }]}
                  >
                    <Text style={styles.ctaSecondaryText}>Annulla</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <Text style={styles.listHeader}>{list.length} locali registrati</Text>
            {loading ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 20 }} />
            ) : (
              list.map((loc) => (
                <View key={loc.id} style={styles.row}>
                  <Image source={{ uri: loc.image_url }} style={styles.rowImg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{loc.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{loc.city} · {loc.cuisine}</Text>
                    <Text style={styles.rowMeta2} numberOfLines={1}>{loc.category} · {loc.price_range || "—"}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push(`/admin/locali?edit=${loc.id}` as any)}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="pencil" size={18} color={colors.brand} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => remove(loc.id, loc.name)}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  kbd,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  kbd?: "default" | "email-address" | "phone-pad";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={kbd || "default"}
        autoCapitalize={kbd === "email-address" ? "none" : "sentences"}
      />
    </View>
  );
}

function ImagePickerRow({ label, value, onPick }: { label: string; value: string; onPick: () => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={onPick} style={styles.imagePicker}>
        {value ? (
          <Image source={{ uri: value }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera" size={24} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12 }}>Tocca per caricare</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { flex: 1, color: "#fff", fontSize: 22, fontWeight: "900" },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  formCard: { backgroundColor: colors.bgSecondary, borderRadius: radii.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  formTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 14 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14 },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.bgTertiary, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  pillTextActive: { color: "#fff" },
  imagePicker: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, overflow: "hidden", height: 140 },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  imagePreview: { width: "100%", height: "100%" },
  cta: { backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radii.md, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  ctaSecondary: { backgroundColor: colors.bgTertiary, paddingVertical: 14, borderRadius: radii.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  ctaSecondaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  listHeader: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginBottom: 8, backgroundColor: colors.bgSecondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  rowImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#222" },
  rowName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowMeta2: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgTertiary, alignItems: "center", justifyContent: "center" },
});
