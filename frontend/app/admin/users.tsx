import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, TOKEN_KEY } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  has_push_token: boolean;
  notifications_enabled: boolean;
  notifications_radius_km?: number | null;
  city?: string | null;
  has_location: boolean;
};

function apiBase() {
  return process.env.EXPO_PUBLIC_BACKEND_URL || "";
}

export default function AdminUsers() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [onlyOptin, setOnlyOptin] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<AdminUser[]>("/admin/users", {
        params: query ? { q: query } : undefined,
      });
      setUsers(r.data);
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (authLoading) return; // wait auth hydration
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/(tabs)/profile");
      return;
    }
    load();
  }, [user, authLoading, load, router]);

  const stats = useMemo(() => {
    const total = users.length;
    const withToken = users.filter((u) => u.has_push_token).length;
    const optin = users.filter((u) => u.notifications_enabled).length;
    const geoLocated = users.filter((u) => u.has_location).length;
    return { total, withToken, optin, geoLocated };
  }, [users]);

  const onDownloadCsv = async () => {
    setExporting(true);
    try {
      const url = `${apiBase()}/api/admin/users/export.csv`;
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (Platform.OS === "web") {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
        a.href = href;
        a.download = `latinfun_users_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      } else {
        // Fetch content, write to cache, share
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await resp.text();
        // Minimal fallback: open a data URL
        const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`;
        await Linking.openURL(dataUrl);
      }
    } catch (e: any) {
      Alert.alert("Errore", e.message);
    } finally {
      setExporting(false);
    }
  };

  const onCopyEmails = async () => {
    const emails = users.map((u) => u.email).join(", ");
    try {
      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(emails);
        Alert.alert("Copiato!", `${users.length} email copiate negli appunti.`);
      } else {
        // Fall back to Clipboard from RN - use expo-clipboard if available, else alert
        Alert.alert("Email utenti", emails.slice(0, 500) + (emails.length > 500 ? "..." : ""));
      }
    } catch (e: any) {
      Alert.alert("Errore", e.message);
    }
  };

  const onBroadcast = async () => {
    if (title.trim().length < 2 || body.trim().length < 2) {
      Alert.alert("Dati mancanti", "Titolo e messaggio obbligatori (min 2 caratteri)");
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const r = await api.post("/admin/broadcast", {
        title: title.trim(),
        body: body.trim(),
        city: cityFilter.trim() || null,
        only_with_notifications: onlyOptin,
      });
      setLastResult(`Inviata a ${r.data.recipients} utenti`);
      setTitle("");
      setBody("");
      Alert.alert("Inviata", `Notifica inviata a ${r.data.recipients} utenti.`);
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="admin-users">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="admin-users-back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>ADMIN</Text>
            <Text style={styles.title}>Utenti registrati</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Totali" value={stats.total} />
          <Stat label="Push OK" value={stats.withToken} tone="gold" />
          <Stat label="Opt-in" value={stats.optin} tone="gold" />
          <Stat label="Geo" value={stats.geoLocated} />
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            testID="admin-csv"
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={onDownloadCsv}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download" size={18} color="#fff" />
                <Text style={styles.actionText}>Scarica CSV</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            testID="admin-copy"
            style={[styles.actionBtn, styles.actionGhost]}
            onPress={onCopyEmails}
          >
            <Ionicons name="copy" size={18} color={colors.brand} />
            <Text style={[styles.actionText, { color: colors.brand }]}>Copia email</Text>
          </TouchableOpacity>
        </View>

        {/* Broadcast */}
        <Text style={styles.sectionLabel}>NOTIFICA BROADCAST</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invia a tutti i device registrati</Text>
          <Text style={styles.cardDesc}>
            Le notifiche arrivano solo agli utenti con token push valido e opt-in attivo.
            Usa questo per news, evento top, offerte.
          </Text>

          <Text style={styles.label}>Titolo</Text>
          <TextInput
            testID="bc-title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Es. Questo weekend a Milano..."
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Messaggio</Text>
          <TextInput
            testID="bc-body"
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={body}
            onChangeText={setBody}
            placeholder="Apri l'app e scopri le serate della settimana"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Text style={styles.label}>Citta (opzionale, filtra destinatari)</Text>
          <TextInput
            testID="bc-city"
            style={styles.input}
            value={cityFilter}
            onChangeText={setCityFilter}
            placeholder="Vuoto = tutti. Es. Milano, Roma..."
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            testID="bc-optin-toggle"
            style={styles.toggleRow}
            onPress={() => setOnlyOptin((v) => !v)}
          >
            <Ionicons
              name={onlyOptin ? "checkbox" : "square-outline"}
              size={22}
              color={onlyOptin ? colors.brand : colors.textSecondary}
            />
            <Text style={styles.toggleText}>
              Solo utenti con opt-in notifiche attivo (consigliato)
            </Text>
          </TouchableOpacity>

          {lastResult ? (
            <View style={styles.resultBox}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.resultText}>{lastResult}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            testID="bc-send"
            style={[styles.actionBtn, styles.actionPrimary, { marginTop: 14 }]}
            onPress={onBroadcast}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.actionText}>Invia notifica</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Search + list */}
        <Text style={styles.sectionLabel}>ELENCO UTENTI ({users.length})</Text>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            testID="admin-users-search"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={load}
            placeholder="Cerca per nome o email..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setTimeout(load, 50);
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {users.map((u) => (
          <View key={u.id} style={styles.row} testID={`admin-user-${u.id}`}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.rowName}>{u.name}</Text>
                {u.role === "admin" ? (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>ADMIN</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowEmail}>{u.email}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                {u.has_push_token ? <Tag text="PUSH" tone="gold" /> : <Tag text="NO PUSH" tone="muted" />}
                {u.notifications_enabled ? <Tag text="OPT-IN" tone="green" /> : null}
                {u.has_location ? <Tag text="GEO" tone="brand" /> : null}
                {u.city ? <Tag text={u.city} tone="muted" /> : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === "web" && navigator.clipboard) {
                  navigator.clipboard.writeText(u.email);
                }
                Linking.openURL(`mailto:${u.email}`);
              }}
              style={styles.mailBtn}
            >
              <Ionicons name="mail" size={18} color={colors.brand} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "gold" }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, tone === "gold" && { color: colors.gold }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Tag({ text, tone }: { text: string; tone: "gold" | "green" | "brand" | "muted" }) {
  const bg =
    tone === "gold"
      ? "rgba(245,158,11,0.15)"
      : tone === "green"
      ? "rgba(16,185,129,0.15)"
      : tone === "brand"
      ? "rgba(236,72,153,0.15)"
      : "rgba(255,255,255,0.06)";
  const col =
    tone === "gold"
      ? colors.gold
      : tone === "green"
      ? "#10B981"
      : tone === "brand"
      ? colors.brand
      : colors.textSecondary;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: col }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
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
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: "700", marginTop: 2 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.pill,
    paddingVertical: 13,
  },
  actionPrimary: { backgroundColor: colors.brand },
  actionGhost: { borderWidth: 1, borderColor: colors.brand },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cardDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  label: { color: "#fff", fontWeight: "700", fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  toggleText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderRadius: radii.md,
  },
  resultText: { color: "#10B981", fontWeight: "800", fontSize: 12 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  rowName: { color: "#fff", fontWeight: "800", fontSize: 14 },
  rowEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  roleBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: { color: "#050505", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  mailBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
