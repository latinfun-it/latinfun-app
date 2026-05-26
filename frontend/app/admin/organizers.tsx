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
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";

type OrganizerRow = {
  user_id: string;
  type: string;
  name: string;
  city?: string;
  phone?: string;
  verified?: boolean;
  active?: boolean;
  created_at?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  dj: "DJ",
  school: "Scuola",
  promoter: "Promoter",
  venue: "Locale",
};

const TYPE_ICONS: Record<string, any> = {
  dj: "headset",
  school: "school",
  promoter: "megaphone",
  venue: "business",
};

export default function AdminOrganizers() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<OrganizerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "revoked">("all");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<OrganizerRow[]>("/admin/organizers");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Impossibile caricare gli organizzatori";
      Alert.alert("Errore", String(detail));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") {
      Alert.alert("Accesso negato", "Solo l'amministratore puo accedere a questa pagina");
      router.replace("/(tabs)/home" as any);
      return;
    }
    load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      // filter
      if (filter === "verified" && !it.verified) return false;
      if (filter === "unverified" && (it.verified || it.active === false)) return false;
      if (filter === "revoked" && it.active !== false) return false;
      // search
      if (!q) return true;
      const hay = [
        it.name,
        it.user?.email,
        it.user?.name,
        it.city,
        it.phone,
        it.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, filter]);

  const counts = useMemo(() => {
    const total = items.length;
    const verified = items.filter((i) => i.verified).length;
    const revoked = items.filter((i) => i.active === false).length;
    return { total, verified, unverified: total - verified - revoked, revoked };
  }, [items]);

  const onVerify = (item: OrganizerRow) => {
    Alert.alert(
      "Verifica organizzatore",
      `Confermi la verifica di "${item.name}"? Apparira la stellina ⭐ sui suoi contenuti.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Verifica",
          onPress: async () => {
            try {
              await api.post(`/admin/organizers/${item.user_id}/verify`);
              setItems((prev) =>
                prev.map((p) => (p.user_id === item.user_id ? { ...p, verified: true } : p))
              );
            } catch (e: any) {
              Alert.alert("Errore", e?.response?.data?.detail || "Operazione fallita");
            }
          },
        },
      ]
    );
  };

  const onUnverify = (item: OrganizerRow) => {
    Alert.alert(
      "Rimuovi verifica",
      `Confermi di rimuovere la verifica a "${item.name}"?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Rimuovi",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`/admin/organizers/${item.user_id}/unverify`);
              setItems((prev) =>
                prev.map((p) => (p.user_id === item.user_id ? { ...p, verified: false } : p))
              );
            } catch (e: any) {
              Alert.alert("Errore", e?.response?.data?.detail || "Operazione fallita");
            }
          },
        },
      ]
    );
  };

  const onRevoke = (item: OrganizerRow) => {
    Alert.alert(
      "Revoca organizzatore",
      `Confermi di revocare il ruolo organizzatore a "${item.name}"?\n\nL'utente non potra piu pubblicare contenuti, ma quelli esistenti restano.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Revoca",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/admin/organizers/${item.user_id}`);
              setItems((prev) =>
                prev.map((p) =>
                  p.user_id === item.user_id ? { ...p, active: false, verified: false } : p
                )
              );
            } catch (e: any) {
              Alert.alert("Errore", e?.response?.data?.detail || "Operazione fallita");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: "Organizzatori",
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8, paddingVertical: 6 }}
              testID="admin-organizers-back"
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={colors.brand}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
              />
            }
          >
            {/* Stats summary */}
            <View style={s.statsRow}>
              <StatCard label="Totali" value={counts.total} color={colors.textSecondary} />
              <StatCard label="Verificati" value={counts.verified} color={colors.gold} icon="checkmark-circle" />
              <StatCard label="Da verificare" value={counts.unverified} color="#fff" />
              <StatCard label="Revocati" value={counts.revoked} color={colors.brand} />
            </View>

            {/* Search */}
            <View style={s.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Cerca per nome, email, citta..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                testID="organizers-search"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter chips */}
            <View style={s.chipsRow}>
              <FilterChip active={filter === "all"} label="Tutti" onPress={() => setFilter("all")} />
              <FilterChip
                active={filter === "verified"}
                label="⭐ Verificati"
                onPress={() => setFilter("verified")}
              />
              <FilterChip
                active={filter === "unverified"}
                label="Da verificare"
                onPress={() => setFilter("unverified")}
              />
              <FilterChip
                active={filter === "revoked"}
                label="Revocati"
                onPress={() => setFilter("revoked")}
              />
            </View>

            {/* List */}
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="people-outline" size={42} color={colors.textMuted} />
                <Text style={s.emptyTxt}>Nessun organizzatore trovato</Text>
              </View>
            ) : (
              filtered.map((it) => (
                <View key={it.user_id} style={s.card} testID={`organizer-${it.user_id}`}>
                  <View style={s.cardHeader}>
                    <View style={[s.typeBadge, { backgroundColor: badgeBg(it.type) }]}>
                      <Ionicons
                        name={TYPE_ICONS[it.type] || "person"}
                        size={14}
                        color="#fff"
                      />
                      <Text style={s.typeBadgeText}>{TYPE_LABELS[it.type] || it.type}</Text>
                    </View>
                    {it.verified ? (
                      <View style={s.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                        <Text style={s.verifiedTxt}>Verificato</Text>
                      </View>
                    ) : null}
                    {it.active === false ? (
                      <View style={s.revokedBadge}>
                        <Ionicons name="ban" size={14} color={colors.brand} />
                        <Text style={s.revokedTxt}>Revocato</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={s.name}>{it.name}</Text>
                  {it.user?.email ? (
                    <Text style={s.email}>
                      <Ionicons name="mail-outline" size={12} color={colors.textMuted} /> {it.user.email}
                    </Text>
                  ) : null}
                  <View style={s.metaRow}>
                    {it.city ? (
                      <Text style={s.meta}>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} /> {it.city}
                      </Text>
                    ) : null}
                    {it.phone ? (
                      <Text style={s.meta}>
                        <Ionicons name="call-outline" size={12} color={colors.textMuted} /> {it.phone}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View style={s.actionsRow}>
                    {it.active !== false ? (
                      it.verified ? (
                        <TouchableOpacity
                          style={[s.actionBtn, s.unverifyBtn]}
                          onPress={() => onUnverify(it)}
                          activeOpacity={0.85}
                          testID={`unverify-${it.user_id}`}
                        >
                          <Ionicons name="close-circle-outline" size={16} color={colors.gold} />
                          <Text style={[s.actionTxt, { color: colors.gold }]}>Rimuovi ⭐</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[s.actionBtn, s.verifyBtn]}
                          onPress={() => onVerify(it)}
                          activeOpacity={0.85}
                          testID={`verify-${it.user_id}`}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#0F0F12" />
                          <Text style={[s.actionTxt, { color: "#0F0F12" }]}>Verifica ⭐</Text>
                        </TouchableOpacity>
                      )
                    ) : null}
                    {it.active !== false ? (
                      <TouchableOpacity
                        style={[s.actionBtn, s.revokeBtn]}
                        onPress={() => onRevoke(it)}
                        activeOpacity={0.85}
                        testID={`revoke-${it.user_id}`}
                      >
                        <Ionicons name="ban-outline" size={16} color={colors.brand} />
                        <Text style={[s.actionTxt, { color: colors.brand }]}>Revoca</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function badgeBg(type: string) {
  if (type === "dj") return "#7C3AED";
  if (type === "school") return "#0EA5E9";
  if (type === "promoter") return "#F97316";
  if (type === "venue") return "#10B981";
  return "#6B7280";
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: any }) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon ? <Ionicons name={icon} size={14} color={color} /> : null}
        <Text style={[s.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },

  chipsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipTxt: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  chipTxtActive: { color: "#fff" },

  empty: { alignItems: "center", padding: spacing.xl, gap: 10 },
  emptyTxt: { color: colors.textMuted, fontSize: 14 },

  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  verifiedTxt: { color: colors.gold, fontSize: 11, fontWeight: "800" },
  revokedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(229,41,71,0.15)",
  },
  revokedTxt: { color: colors.brand, fontSize: 11, fontWeight: "800" },

  name: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  email: { color: colors.textSecondary, fontSize: 12 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 6, flexWrap: "wrap" },
  meta: { color: colors.textMuted, fontSize: 12 },

  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  actionTxt: { fontSize: 12, fontWeight: "800" },
  verifyBtn: { backgroundColor: colors.gold, borderColor: colors.gold },
  unverifyBtn: { borderColor: colors.gold },
  revokeBtn: { borderColor: colors.brand },
});
