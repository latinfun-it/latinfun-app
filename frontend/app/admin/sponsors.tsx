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
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import BrandHeader from "../../src/BrandHeader";

type Sponsor = {
  id: string;
  title: string;
  subtitle?: string;
  brand?: string;
  image_url: string;
  link_url?: string;
  cta_label?: string;
  position: string;
  priority: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  description?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tickets_url?: string | null;
  signup_url?: string | null;
  event_id?: string | null;
  clicks: number;
  impressions: number;
};

const POSITIONS = [
  { id: "home_top", label: "Home - Alto" },
  { id: "home_middle", label: "Home - Centro" },
  { id: "home_bottom", label: "Home - Basso" },
];

export default function AdminSponsors() {
  const router = useRouter();
  const [list, setList] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Sponsor | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Sponsor[]>("/admin/sponsors");
      setList(r.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const newSponsor = (): Sponsor => ({
    id: "",
    title: "",
    subtitle: "",
    brand: "",
    image_url: "",
    link_url: "",
    cta_label: "Scopri",
    position: "home_top",
    priority: 0,
    active: true,
    starts_at: null,
    ends_at: null,
    description: "",
    instagram_url: "",
    facebook_url: "",
    tiktok_url: "",
    whatsapp: "",
    phone: "",
    email: "",
    address: "",
    tickets_url: "",
    signup_url: "",
    event_id: "",
    clicks: 0,
    impressions: 0,
  });

  const remove = async (s: Sponsor) => {
    const msg = `Eliminare lo sponsor "${s.title}"?`;
    const go = async () => {
      await api.delete(`/admin/sponsors/${s.id}`);
      load();
    };
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm(msg)) go();
    } else {
      Alert.alert("Conferma", msg, [
        { text: "Annulla", style: "cancel" },
        { text: "Elimina", style: "destructive", onPress: go },
      ]);
    }
  };

  if (editing) {
    return (
      <SponsorEditor
        item={editing}
        onClose={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={ss.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ss.kicker}>ADMIN</Text>
            <Text style={ss.title}>Sponsor Banner</Text>
          </View>
          <TouchableOpacity
            testID="add-sponsor"
            onPress={() => setEditing(newSponsor())}
            style={[ss.iconBtn, { backgroundColor: colors.brand, borderColor: colors.brand }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
            {list.length === 0 ? (
              <View style={ss.empty}>
                <Ionicons name="megaphone-outline" size={42} color={colors.textMuted} />
                <Text style={ss.emptyTitle}>Nessuno sponsor</Text>
                <Text style={ss.dim}>Aggiungi il primo banner per generare entrate.</Text>
                <TouchableOpacity
                  style={ss.primaryBtn}
                  onPress={() => setEditing(newSponsor())}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={ss.primaryText}>Aggiungi sponsor</Text>
                </TouchableOpacity>
              </View>
            ) : (
              list.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  testID={`sponsor-row-${s.id}`}
                  activeOpacity={0.85}
                  onPress={() => setEditing(s)}
                  style={ss.row}
                >
                  <Image source={{ uri: s.image_url }} style={ss.thumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={ss.rowTitle} numberOfLines={1}>{s.title}</Text>
                    {s.brand ? (
                      <Text style={ss.rowMeta} numberOfLines={1}>{s.brand}</Text>
                    ) : null}
                    <View style={ss.tagsRow}>
                      <View style={[ss.tag, !s.active && { backgroundColor: "#374151" }]}>
                        <Text style={ss.tagText}>
                          {s.active ? "ATTIVO" : "OFF"}
                        </Text>
                      </View>
                      <View style={ss.tag}>
                        <Text style={ss.tagText}>
                          {POSITIONS.find((p) => p.id === s.position)?.label || s.position}
                        </Text>
                      </View>
                    </View>
                    <Text style={ss.stats}>
                      👁 {s.impressions} · 🖱 {s.clicks} clicks
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => remove(s)}
                    style={ss.deleteBtn}
                  >
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function SponsorEditor({
  item,
  onClose,
}: {
  item: Sponsor;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle || "");
  const [brand, setBrand] = useState(item.brand || "");
  const [imageUrl, setImageUrl] = useState(item.image_url);
  const [linkUrl, setLinkUrl] = useState(item.link_url || "");
  const [ctaLabel, setCtaLabel] = useState(item.cta_label || "Scopri");
  const [position, setPosition] = useState(item.position);
  const [priority, setPriority] = useState(String(item.priority || 0));
  const [active, setActive] = useState(item.active);
  const [description, setDescription] = useState(item.description || "");
  const [instagramUrl, setInstagramUrl] = useState(item.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(item.facebook_url || "");
  const [tiktokUrl, setTiktokUrl] = useState(item.tiktok_url || "");
  const [whatsapp, setWhatsapp] = useState(item.whatsapp || "");
  const [phone, setPhone] = useState(item.phone || "");
  const [email, setEmail] = useState(item.email || "");
  const [address, setAddress] = useState(item.address || "");
  const [ticketsUrl, setTicketsUrl] = useState(item.tickets_url || "");
  const [signupUrl, setSignupUrl] = useState(item.signup_url || "");
  const [eventId, setEventId] = useState(item.event_id || "");
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (!r.canceled && r.assets[0]?.base64) {
        setImageUrl(`data:image/jpeg;base64,${r.assets[0].base64}`);
      }
    } catch {
      /* silent */
    }
  };

  const save = async () => {
    if (!title.trim() || !imageUrl) {
      const m = "Titolo e immagine sono obbligatori";
      if (Platform.OS === "web") alert(m);
      else Alert.alert("Mancano dati", m);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        brand: brand.trim() || null,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        cta_label: ctaLabel.trim() || "Scopri",
        position,
        priority: parseInt(priority || "0", 10) || 0,
        active,
        description: description.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        whatsapp: whatsapp.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        tickets_url: ticketsUrl.trim() || null,
        signup_url: signupUrl.trim() || null,
        event_id: eventId.trim() || null,
      };
      if (item.id) {
        await api.put(`/admin/sponsors/${item.id}`, payload);
      } else {
        await api.post("/admin/sponsors", payload);
      }
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.detail || "Errore durante il salvataggio";
      if (Platform.OS === "web") alert(m);
      else Alert.alert("Errore", m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BrandHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={ss.headerRow}>
            <TouchableOpacity onPress={onClose} style={ss.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={ss.kicker}>SPONSOR</Text>
              <Text style={ss.title}>
                {item.id ? "Modifica banner" : "Nuovo banner"}
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={ss.label}>IMMAGINE BANNER (16:9) *</Text>
            <TouchableOpacity onPress={pickImage} style={ss.bannerWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={ss.bannerImg} />
              ) : (
                <View style={[ss.bannerImg, ss.bannerPh]}>
                  <Ionicons name="image" size={36} color={colors.brand} />
                  <Text style={ss.dim}>Scegli immagine</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={ss.label}>TITOLO *</Text>
            <TextInput
              style={ss.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Es. Sconto -20% su scarpe da ballo"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />

            <Text style={ss.label}>SOTTOTITOLO</Text>
            <TextInput
              style={ss.input}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Es. Solo per gli utenti LatinFun"
              placeholderTextColor={colors.textMuted}
              maxLength={160}
            />

            <Text style={ss.label}>BRAND</Text>
            <TextInput
              style={ss.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Es. Capezio, Pampero..."
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />

            <Text style={ss.label}>LINK (URL al sito sponsor)</Text>
            <TextInput
              style={ss.input}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://esempio.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={ss.label}>TESTO PULSANTE</Text>
            <TextInput
              style={ss.input}
              value={ctaLabel}
              onChangeText={setCtaLabel}
              placeholder="Scopri"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
            />

            {/* ===== Pagina Dettaglio Sponsor ===== */}
            <View style={ss.sectionDivider}>
              <Text style={ss.sectionTitle}>📄 PAGINA DETTAGLIO</Text>
              <Text style={ss.sectionHint}>
                Aggiungi info e link che apparirano quando l'utente clicca sul banner.
              </Text>
            </View>

            <Text style={ss.label}>DESCRIZIONE</Text>
            <TextInput
              style={[ss.input, { minHeight: 80, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descrizione lunga (max 2000 caratteri)..."
              placeholderTextColor={colors.textMuted}
              maxLength={2000}
              multiline
            />

            <Text style={ss.label}>🎟️ LINK ACQUISTO BIGLIETTI (monetizza)</Text>
            <TextInput
              style={ss.input}
              value={ticketsUrl}
              onChangeText={setTicketsUrl}
              placeholder="https://ticketone.it/evento/..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={ss.label}>✍️ LINK ISCRIZIONE / PRENOTAZIONE (corsi)</Text>
            <TextInput
              style={ss.input}
              value={signupUrl}
              onChangeText={setSignupUrl}
              placeholder="https://scuola.it/iscriviti"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={ss.label}>🎉 ID EVENTO COLLEGATO (opzionale)</Text>
            <TextInput
              style={ss.input}
              value={eventId}
              onChangeText={setEventId}
              placeholder="UUID evento (dalla lista eventi)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <Text style={ss.label}>📷 INSTAGRAM URL</Text>
            <TextInput
              style={ss.input}
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              placeholder="https://instagram.com/profilo"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={ss.label}>📘 FACEBOOK URL</Text>
            <TextInput
              style={ss.input}
              value={facebookUrl}
              onChangeText={setFacebookUrl}
              placeholder="https://facebook.com/pagina"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={ss.label}>🎵 TIKTOK URL</Text>
            <TextInput
              style={ss.input}
              value={tiktokUrl}
              onChangeText={setTiktokUrl}
              placeholder="https://tiktok.com/@profilo"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={ss.label}>💬 WHATSAPP (numero con prefisso)</Text>
            <TextInput
              style={ss.input}
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="+39 333 1234567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={ss.label}>📞 TELEFONO</Text>
            <TextInput
              style={ss.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+39 06 1234567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={ss.label}>📧 EMAIL</Text>
            <TextInput
              style={ss.input}
              value={email}
              onChangeText={setEmail}
              placeholder="info@esempio.it"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={ss.label}>📍 INDIRIZZO (apre mappa)</Text>
            <TextInput
              style={ss.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Via Roma 1, Rimini RN"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
            />

            <View style={ss.sectionDivider}>
              <Text style={ss.sectionTitle}>⚙️ IMPOSTAZIONI</Text>
            </View>

            <Text style={ss.label}>POSIZIONE</Text>
            <View style={ss.chipsRow}>
              {POSITIONS.map((p) => {
                const on = position === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPosition(p.id)}
                    style={[ss.chip, on && ss.chipOn]}
                  >
                    <Text style={[ss.chipText, on && ss.chipTextOn]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={ss.label}>PRIORITÀ (più alta = mostrato prima)</Text>
            <TextInput
              style={ss.input}
              value={priority}
              onChangeText={(t) => setPriority(t.replace(/[^0-9]/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <View style={ss.switchRow}>
              <Text style={[ss.label, { marginTop: 0 }]}>BANNER ATTIVO</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                thumbColor={active ? colors.brand : "#666"}
                trackColor={{ true: "rgba(236,72,153,0.4)", false: "#333" }}
              />
            </View>

            {item.id ? (
              <View style={ss.statsBox}>
                <Text style={ss.statsLabel}>STATISTICHE</Text>
                <Text style={ss.statsTxt}>
                  👁 {item.impressions} visualizzazioni · 🖱 {item.clicks} clicks
                </Text>
                <Text style={ss.statsTxt}>
                  CTR: {item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(1) : "0"}%
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              testID="save-sponsor"
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
                  <Text style={ss.saveText}>
                    {item.id ? "Salva modifiche" : "Crea sponsor"}
                  </Text>
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
  headerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  empty: { alignItems: "center", padding: 40, gap: 10 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 6 },
  dim: { color: colors.textSecondary, fontSize: 13, textAlign: "center" },
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    padding: 10, marginBottom: 10,
  },
  thumb: { width: 70, height: 70, borderRadius: radii.sm, backgroundColor: "#222" },
  rowTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  tagsRow: { flexDirection: "row", gap: 5, marginTop: 6 },
  tag: {
    backgroundColor: "rgba(236,72,153,0.18)",
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { color: colors.brand, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  stats: { color: colors.gold, fontSize: 11, marginTop: 4, fontWeight: "700" },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.5)",
  },
  label: { color: colors.brand, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginTop: 16, marginBottom: 6 },
  sectionDivider: {
    marginTop: 28,
    marginBottom: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.sm,
    color: "#fff", padding: 12, fontSize: 14,
  },
  bannerWrap: { width: "100%" },
  bannerImg: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.md, backgroundColor: colors.bgSecondary },
  bannerPh: {
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  chipTextOn: { color: "#fff" },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 18, paddingVertical: 8,
  },
  statsBox: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14, marginTop: 18,
  },
  statsLabel: { color: colors.gold, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 6 },
  statsTxt: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14, borderRadius: radii.pill,
    marginTop: 28,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: radii.pill,
    marginTop: 14,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
