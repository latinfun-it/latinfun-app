import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

type Lead = {
  id: string;
  school_id: string;
  school_name: string;
  sender_name: string;
  sender_email: string | null;
  sender_phone: string | null;
  level: string;
  styles: string[];
  message: string;
  unlocked: boolean;
  contacted: boolean;
  created_at: string;
};

const LEVEL_COLOR: Record<string, string> = {
  principiante: "#3DB7FF",
  intermedio: "#FFB400",
  avanzato: "#FF3154",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new">("all");

  const load = useCallback(async () => {
    try {
      const r = await api.get<Lead[]>("/my/school-leads");
      setLeads(r.data);
    } catch (err: any) {
      // empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const unlockLead = async (lead: Lead) => {
    if (unlockingId) return;
    const confirmText =
      `Sblocca questo lead per €2.00?\n\nVedrai email e telefono di ${lead.sender_name}.`;
    const yes =
      Platform.OS === "web"
        ? // eslint-disable-next-line no-alert
          window.confirm(confirmText)
        : await new Promise<boolean>((resolve) =>
            Alert.alert("Sblocca lead", confirmText, [
              { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
              { text: "Sblocca €2", onPress: () => resolve(true) },
            ])
          );
    if (!yes) return;
    setUnlockingId(lead.id);
    try {
      const r = await api.post(`/schools/${lead.school_id}/leads/${lead.id}/unlock`, {
        origin_url: typeof window !== "undefined" ? window.location.origin : "",
      });
      const data = r.data as any;
      if (data?.unlocked) {
        // admin gratis
        load();
      } else if (data?.url) {
        // redirect to Stripe checkout
        if (Platform.OS === "web") {
          window.location.href = data.url;
        } else {
          Linking.openURL(data.url);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Errore sblocco";
      if (Platform.OS === "web") {
        window.alert("Errore: " + msg);
      } else {
        Alert.alert("Errore", msg);
      }
    } finally {
      setUnlockingId(null);
    }
  };

  const markContacted = async (lead: Lead) => {
    try {
      await api.post(`/schools/${lead.school_id}/leads/${lead.id}/contacted`);
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, contacted: true } : l))
      );
    } catch {
      /* silent */
    }
  };

  const sendEmail = (l: Lead) => {
    if (!l.sender_email) return;
    const subj = encodeURIComponent(`Risposta da ${l.school_name}`);
    Linking.openURL(`mailto:${l.sender_email}?subject=${subj}`);
    if (!l.contacted) markContacted(l);
  };

  const callPhone = (l: Lead) => {
    if (!l.sender_phone) return;
    Linking.openURL(`tel:${l.sender_phone.replace(/\s/g, "")}`);
    if (!l.contacted) markContacted(l);
  };

  const filtered =
    filter === "new" ? leads.filter((l) => !l.contacted) : leads;
  const newCount = leads.filter((l) => !l.contacted).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="my-leads-screen">
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.title}>I tuoi lead</Text>
          <Text style={styles.sub}>
            {leads.length} totali · {newCount} nuovi
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <View style={styles.tabs}>
        <Tab
          label="Tutti"
          active={filter === "all"}
          count={leads.length}
          onPress={() => setFilter("all")}
        />
        <Tab
          label="Nuovi"
          active={filter === "new"}
          count={newCount}
          onPress={() => setFilter("new")}
          highlight
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="paper-plane-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nessun lead ricevuto</Text>
            <Text style={styles.emptyHint}>
              Quando uno studente compila il form "Richiedi info" sulla tua scuola, lo vedrai qui.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.contacted && styles.cardNew]}>
            <View style={styles.row}>
              <Text style={styles.school} numberOfLines={1}>
                {item.school_name}
              </Text>
              <Text style={styles.date}>{fmtDate(item.created_at)}</Text>
            </View>

            <View style={styles.row2}>
              <Text style={styles.name}>{item.sender_name}</Text>
              <View
                style={[
                  styles.levelBadge,
                  {
                    backgroundColor: (LEVEL_COLOR[item.level] || "#888") + "22",
                    borderColor: LEVEL_COLOR[item.level] || "#888",
                  },
                ]}
              >
                <Text
                  style={[styles.levelText, { color: LEVEL_COLOR[item.level] || "#888" }]}
                >
                  {item.level.toUpperCase()}
                </Text>
              </View>
            </View>

            {(item.styles || []).length > 0 ? (
              <View style={styles.tagsRow}>
                {item.styles.slice(0, 5).map((s) => (
                  <View key={s} style={styles.tag}>
                    <Text style={styles.tagText}>{s}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.message}>{item.message}</Text>

            {item.unlocked ? (
              <View style={styles.contactBox}>
                {item.sender_email ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => sendEmail(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="mail" size={16} color={colors.brand} />
                    <Text style={styles.contactText}>{item.sender_email}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
                {item.sender_phone ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => callPhone(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call" size={16} color={colors.brand} />
                    <Text style={styles.contactText}>{item.sender_phone}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => unlockLead(item)}
                disabled={unlockingId === item.id}
                activeOpacity={0.9}
                style={styles.unlockBtn}
                testID={`unlock-${item.id}`}
              >
                {unlockingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="lock-open" size={16} color="#fff" />
                    <Text style={styles.unlockText}>Sblocca contatti · €2</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {item.contacted ? (
              <View style={styles.contactedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#5BCC8A" />
                <Text style={styles.contactedText}>Contattato</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

function Tab({
  label,
  active,
  count,
  onPress,
  highlight,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
      activeOpacity={0.85}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <View
        style={[
          styles.countBadge,
          {
            backgroundColor: active
              ? "#fff"
              : highlight && count > 0
              ? colors.brand
              : colors.bgTertiary,
          },
        ]}
      >
        <Text
          style={{
            color: active
              ? colors.brand
              : highlight && count > 0
              ? "#fff"
              : colors.textSecondary,
            fontSize: 11,
            fontWeight: "800",
          }}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  tabTextActive: { color: "#fff" },
  countBadge: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardNew: { borderLeftWidth: 4, borderLeftColor: colors.brand },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row2: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  school: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  date: { color: colors.textMuted, fontSize: 11 },
  name: { color: "#fff", fontSize: 16, fontWeight: "900", flex: 1 },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  levelText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  tagText: { color: colors.textSecondary, fontSize: 10, fontWeight: "700" },
  message: { color: "#fff", fontSize: 13, lineHeight: 19 },
  contactBox: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.md,
    padding: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  contactText: { color: "#fff", flex: 1, fontSize: 13, fontWeight: "600" },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  unlockText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  contactedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  contactedText: { color: "#5BCC8A", fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});
