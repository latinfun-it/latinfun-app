import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../src/api";
import { colors, radii, spacing } from "../src/theme";
import type { DJ, EventItem, School } from "../src/types";

type Playlist = {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  genre?: string;
  external_url: string;
};

type Tab = "djs" | "events" | "schools" | "playlists";

export default function Favorites() {
  const router = useRouter();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tab, setTab] = useState<Tab>("djs");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{
        djs: DJ[];
        events: EventItem[];
        schools: School[];
        playlists: Playlist[];
      }>("/my/favorites");
      setDjs(r.data.djs || []);
      setEvents(r.data.events || []);
      setSchools(r.data.schools || []);
      setPlaylists(r.data.playlists || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const lists: Record<Tab, number> = {
    djs: djs.length,
    events: events.length,
    schools: schools.length,
    playlists: playlists.length,
  };
  const empty = lists[tab] === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="favorites">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="fav-back"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>LA TUA RACCOLTA</Text>
            <Text style={styles.title}>I miei preferiti</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          <TabBtn
            active={tab === "djs"}
            label={`DJ${djs.length ? ` · ${djs.length}` : ""}`}
            icon="person"
            onPress={() => setTab("djs")}
            testID="fav-tab-djs"
          />
          <TabBtn
            active={tab === "events"}
            label={`Eventi${events.length ? ` · ${events.length}` : ""}`}
            icon="heart"
            onPress={() => setTab("events")}
            testID="fav-tab-events"
          />
          <TabBtn
            active={tab === "schools"}
            label={`Scuole${schools.length ? ` · ${schools.length}` : ""}`}
            icon="school"
            onPress={() => setTab("schools")}
            testID="fav-tab-schools"
          />
          <TabBtn
            active={tab === "playlists"}
            label={`Musica${playlists.length ? ` · ${playlists.length}` : ""}`}
            icon="musical-notes"
            onPress={() => setTab("playlists")}
            testID="fav-tab-playlists"
          />
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        >
          {empty ? (
            <EmptyState tab={tab} router={router} />
          ) : tab === "djs" ? (
            djs.map((d) => (
              <TouchableOpacity
                key={d.id}
                testID={`fav-dj-${d.id}`}
                style={styles.card}
                onPress={() => router.push(`/dj/${d.id}`)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: d.avatar_url }} style={styles.avatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{d.name}</Text>
                    {d.verified_by_mauro ? (
                      <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                    ) : null}
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {d.city} · {(d.genres || []).slice(0, 2).join(" · ")}
                  </Text>
                  <Text style={styles.cardStat}>
                    {(d.followers || 0).toLocaleString("it-IT")} follower
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          ) : tab === "events" ? (
            events.map((e) => {
              const d = new Date(e.date);
              return (
                <TouchableOpacity
                  key={e.id}
                  testID={`fav-event-${e.id}`}
                  style={styles.eventCard}
                  onPress={() => router.push(`/event/${e.id}`)}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: e.image_url }} style={styles.eventCover} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} · {e.city} · {e.venue}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                      <View style={styles.genrePill}>
                        <Text style={styles.genreText}>{e.genre}</Text>
                      </View>
                      {e.boosted ? (
                        <View style={styles.boostPill}>
                          <Ionicons name="flame" size={10} color="#050505" />
                          <Text style={styles.boostText}>BOOST</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          ) : tab === "schools" ? (
            schools.map((s) => (
              <TouchableOpacity
                key={s.id}
                testID={`fav-school-${s.id}`}
                style={styles.eventCard}
                onPress={() => router.push(`/school/${s.id}`)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: s.image_url }} style={styles.eventCover} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{s.name}</Text>
                    {s.verified_by_mauro ? (
                      <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                    ) : null}
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {s.city} · {(s.styles || []).slice(0, 3).join(", ")}
                  </Text>
                  <Text style={styles.cardStat}>{s.students || 0} studenti</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          ) : (
            playlists.map((p) => (
              <TouchableOpacity
                key={p.id}
                testID={`fav-playlist-${p.id}`}
                style={styles.eventCard}
                onPress={() => p.external_url && Linking.openURL(p.external_url)}
                activeOpacity={0.88}
              >
                {p.cover_url ? (
                  <Image source={{ uri: p.cover_url }} style={styles.eventCover} />
                ) : (
                  <View style={[styles.eventCover, styles.coverPlaceholder]}>
                    <Ionicons name="musical-notes" size={28} color={colors.brand} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                  {p.description ? (
                    <Text style={styles.cardMeta} numberOfLines={2}>{p.description}</Text>
                  ) : null}
                  {p.genre ? (
                    <View style={[styles.genrePill, { alignSelf: "flex-start", marginTop: 6 }]}>
                      <Text style={styles.genreText}>{p.genre}</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="open-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function TabBtn({
  active,
  label,
  icon,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={16} color={active ? "#fff" : colors.textSecondary} />
      <Text style={[styles.tabText, active && { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ tab, router }: { tab: Tab; router: any }) {
  const config: Record<Tab, { icon: any; title: string; desc: string; btn: string; route: string }> = {
    djs: {
      icon: "person-add-outline",
      title: "Nessun DJ seguito",
      desc: "Tocca il cuoricino su un DJ per trovarlo qui.",
      btn: "Esplora DJ",
      route: "/(tabs)/djs",
    },
    events: {
      icon: "heart-outline",
      title: "Nessun evento salvato",
      desc: "Tocca il cuoricino su un evento per salvarlo.",
      btn: "Esplora eventi",
      route: "/(tabs)/events",
    },
    schools: {
      icon: "school-outline",
      title: "Nessuna scuola salvata",
      desc: "Tocca il cuoricino su una scuola di ballo per salvarla.",
      btn: "Esplora scuole",
      route: "/(tabs)/schools",
    },
    playlists: {
      icon: "musical-notes-outline",
      title: "Nessuna playlist salvata",
      desc: "Tocca il cuoricino su una playlist per averla a portata di mano.",
      btn: "Esplora musica",
      route: "/(tabs)/music",
    },
  };
  const c = config[tab];
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={c.icon} size={42} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{c.title}</Text>
      <Text style={styles.emptyDesc}>{c.desc}</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push(c.route)}>
        <Text style={styles.emptyBtnText}>{c.btn}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.textSecondary, fontWeight: "800", fontSize: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#222" },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cardMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  cardStat: { color: colors.gold, fontSize: 11, marginTop: 4, fontWeight: "700" },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 10,
  },
  eventCover: { width: 70, height: 70, borderRadius: radii.sm, backgroundColor: "#222" },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236,72,153,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  genrePill: {
    backgroundColor: "rgba(236,72,153,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  genreText: { color: colors.brand, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  boostPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  boostText: { color: "#050505", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  emptyBox: {
    alignItems: "center",
    padding: 32,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginTop: 32,
  },
  emptyTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 12 },
  emptyDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  emptyBtnText: { color: colors.brand, fontWeight: "800" },
});
