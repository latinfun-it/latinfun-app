import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import BrandHeader from "../../src/BrandHeader";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";

type Health = {
  profiles: { total: number; active: number; new_last_7d: number; incomplete_no_photo: number; incomplete_short_bio: number };
  by_city: { city: string; count: number }[];
  by_style: { style: string; count: number }[];
  swipes: { total: number; last_24h: number; likes: number; passes: number; like_ratio_pct: number };
  matches: { total: number; last_24h: number; last_7d: number; match_rate_pct: number };
  chat: { messages_total: number; messages_last_24h: number; matches_with_chat: number; chat_engagement_pct: number };
  recent_matches: { pair_id: string; user_1: string; user_2: string; created_at: string }[];
  alerts: { level: "success" | "warning" | "error"; icon: string; title: string; message: string }[];
};

const ALERT_COLOR: Record<string, string> = {
  success: "#22c55e",
  warning: "#facc15",
  error: "#ef4444",
};

export default function AdminMatchHealth() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Health>("/admin/match-health");
      setData(r.data);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (user?.role !== "admin") {
    return <View style={[s.fill, s.center]}><Text style={{ color: "#fff" }}>Solo admin</Text></View>;
  }

  return (
    <View style={s.fill}>
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>🔥 SISTEMA MATCH</Text>
            <Text style={s.title}>Stato di salute</Text>
          </View>
          <TouchableOpacity onPress={load} style={s.reloadBtn}>
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
        ) : !data ? (
          <View style={s.center}><Text style={{ color: "#fff" }}>Errore caricamento</Text></View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }} tintColor={colors.brand} />}
          >
            {/* Alerts */}
            {data.alerts.map((a, i) => (
              <View key={i} style={[s.alert, { borderColor: ALERT_COLOR[a.level] }]}>
                <Ionicons name={a.icon as any} size={22} color={ALERT_COLOR[a.level]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.alertTitle, { color: ALERT_COLOR[a.level] }]}>{a.title}</Text>
                  <Text style={s.alertMsg}>{a.message}</Text>
                </View>
              </View>
            ))}

            {/* KPI Grid */}
            <View style={s.gridRow}>
              <Kpi label="Profili attivi" value={data.profiles.active} sub={`+${data.profiles.new_last_7d} ultimi 7gg`} icon="people" color="#22c55e" />
              <Kpi label="Match totali" value={data.matches.total} sub={`+${data.matches.last_24h} ultimi 24h`} icon="heart" color="#e11d48" />
            </View>
            <View style={s.gridRow}>
              <Kpi label="Swipes 24h" value={data.swipes.last_24h} sub={`${data.swipes.likes} like · ${data.swipes.passes} pass`} icon="hand-left" color="#3b82f6" />
              <Kpi label="Like ratio" value={`${data.swipes.like_ratio_pct}%`} sub={`media globale`} icon="thumbs-up" color="#facc15" />
            </View>
            <View style={s.gridRow}>
              <Kpi label="Match rate" value={`${data.matches.match_rate_pct}%`} sub={`% swipe → match`} icon="git-merge" color="#a855f7" />
              <Kpi label="Chat engagement" value={`${data.chat.chat_engagement_pct}%`} sub={`${data.chat.matches_with_chat}/${data.matches.total} match attivi`} icon="chatbubbles" color="#06b6d4" />
            </View>
            <View style={s.gridRow}>
              <Kpi label="Msg totali" value={data.chat.messages_total} sub={`+${data.chat.messages_last_24h} ultimi 24h`} icon="mail" color="#f97316" />
              <Kpi label="Profili senza foto" value={data.profiles.incomplete_no_photo} sub={`fix push reminder`} icon="image-outline" color="#94a3b8" />
            </View>

            {/* Per città */}
            <Section title="🏙️ Top città" empty="Nessuna città" items={data.by_city.length}>
              {data.by_city.map((c, i) => (
                <View key={i} style={s.row}>
                  <Text style={s.rowName}>{c.city || "?"}</Text>
                  <View style={s.bar}>
                    <View style={[s.barFill, { width: `${Math.min(100, c.count / (data.by_city[0]?.count || 1) * 100)}%`, backgroundColor: colors.brand }]} />
                  </View>
                  <Text style={s.rowCount}>{c.count}</Text>
                </View>
              ))}
            </Section>

            {/* Per stile */}
            <Section title="💃 Stili di ballo" empty="Nessuno stile" items={data.by_style.length}>
              {data.by_style.map((st, i) => (
                <View key={i} style={s.row}>
                  <Text style={[s.rowName, { textTransform: "capitalize" }]}>{st.style}</Text>
                  <View style={s.bar}>
                    <View style={[s.barFill, { width: `${Math.min(100, st.count / (data.by_style[0]?.count || 1) * 100)}%`, backgroundColor: "#06b6d4" }]} />
                  </View>
                  <Text style={s.rowCount}>{st.count}</Text>
                </View>
              ))}
            </Section>

            {/* Recent matches */}
            <Section title="🔥 Ultimi match" empty="Nessun match recente" items={data.recent_matches.length}>
              {data.recent_matches.map((m) => (
                <View key={m.pair_id} style={s.matchRow}>
                  <Ionicons name="heart" size={16} color="#e11d48" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName}>
                      {m.user_1} <Text style={{ color: colors.brand }}>+</Text> {m.user_2}
                    </Text>
                    <Text style={s.rowMeta}>{new Date(m.created_at).toLocaleString("it-IT")}</Text>
                  </View>
                </View>
              ))}
            </Section>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function Kpi({ label, value, sub, icon, color }: any) {
  return (
    <View style={s.kpi}>
      <View style={[s.kpiIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
}

function Section({ title, items, empty, children }: any) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {items === 0 ? <Text style={s.emptyText}>{empty}</Text> : children}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  reloadBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },

  alert: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: colors.bgSecondary, borderRadius: radii.md, borderWidth: 1, marginBottom: 10, alignItems: "center" },
  alertTitle: { fontSize: 14, fontWeight: "800" },
  alertMsg: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  gridRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: { flex: 1, padding: 12, backgroundColor: colors.bgSecondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  kpiLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", marginTop: 2 },
  kpiSub: { color: colors.textMuted, fontSize: 10, marginTop: 4 },

  section: { marginTop: 20 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 10 },
  emptyText: { color: colors.textMuted, fontStyle: "italic", textAlign: "center", paddingVertical: 14 },

  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowName: { color: "#fff", fontSize: 13, fontWeight: "700", minWidth: 80 },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  rowCount: { color: colors.brand, fontSize: 13, fontWeight: "800", minWidth: 30, textAlign: "right" },
  bar: { flex: 1, height: 6, backgroundColor: colors.bgTertiary, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  matchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
});
