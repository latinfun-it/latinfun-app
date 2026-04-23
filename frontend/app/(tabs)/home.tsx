import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/auth";
import type { EventItem, DJ, Playlist } from "../../src/types";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, d, p] = await Promise.all([
        api.get<EventItem[]>("/events", { params: { featured: true } }),
        api.get<DJ[]>("/djs"),
        api.get<Playlist[]>("/playlists"),
      ]);
      setEvents(e.data);
      setDjs(d.data);
      setPlaylists(p.data);
    } catch (err) {
      // swallow for demo
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

  const hero = events[0];
  const topPlaylist = playlists.find((p) => p.featured) || playlists[0];

  if (loading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* Hero */}
        {hero ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push(`/event/${hero.id}`)}
            testID="home-hero"
          >
            <View style={styles.hero}>
              <Image source={{ uri: hero.image_url }} style={StyleSheet.absoluteFillObject} />
              <LinearGradient
                colors={["transparent", "rgba(5,5,5,0.4)", "#050505"]}
                style={StyleSheet.absoluteFill}
              />
              <SafeAreaView edges={["top"]}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.brandMini}>
                    LATIN<Text style={{ color: colors.brand }}>HUB</Text>
                  </Text>
                  <View style={styles.heroBadge}>
                    <Ionicons name="flash" size={12} color={colors.gold} />
                    <Text style={styles.heroBadgeText}>IN EVIDENZA</Text>
                  </View>
                </View>
              </SafeAreaView>
              <View style={styles.heroBottom}>
                <Text style={styles.heroKicker}>{hero.city.toUpperCase()} - {formatDate(hero.date)}</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>{hero.title}</Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {hero.venue} - {hero.lineup.join(", ")}
                </Text>
                <View style={styles.heroCta}>
                  <Text style={styles.heroCtaText}>Scopri l&apos;evento</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Greeting */}
        <View style={styles.greet}>
          <Text style={styles.greetHi}>Ciao {user?.name?.split(" ")[0] || "amigo"} 👋</Text>
          <Text style={styles.greetSub}>Ecco cosa si muove nella scena questa settimana</Text>
        </View>

        {/* Featured playlist widget */}
        {topPlaylist ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push(`/playlist/${topPlaylist.id}`)}
            style={styles.radioWidget}
            testID="home-playlist-widget"
          >
            <Image source={{ uri: topPlaylist.cover_url }} style={styles.radioArt} />
            <LinearGradient
              colors={["rgba(225,29,72,0.0)", "rgba(225,29,72,0.18)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.radioKicker}>PLAYLIST DEL CURATORE</Text>
              <Text style={styles.radioTitle} numberOfLines={1}>{topPlaylist.title}</Text>
              <Text style={styles.radioMeta}>di {topPlaylist.curator} - {topPlaylist.platform}</Text>
            </View>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Featured events */}
        <SectionHeader title="Eventi in evidenza" onSeeAll={() => router.push("/(tabs)/events")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 14 }}
        >
          {events.map((e) => (
            <TouchableOpacity
              key={e.id}
              testID={`home-event-${e.id}`}
              style={styles.evtCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/event/${e.id}`)}
            >
              <Image source={{ uri: e.image_url }} style={styles.evtImg} />
              {e.boosted ? (
                <View style={styles.boostBadge}>
                  <Ionicons name="flame" size={12} color="#fff" />
                  <Text style={styles.boostBadgeText}>BOOST</Text>
                </View>
              ) : null}
              <View style={styles.evtBody}>
                <Text style={styles.evtDate}>{formatDate(e.date)} - {e.city}</Text>
                <Text style={styles.evtTitle} numberOfLines={2}>{e.title}</Text>
                <Text style={styles.evtGenre}>{e.genre.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top DJs */}
        <SectionHeader title="Top DJ italiani" onSeeAll={() => router.push("/(tabs)/djs")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 14 }}
        >
          {djs.map((d) => (
            <TouchableOpacity
              key={d.id}
              testID={`home-dj-${d.id}`}
              style={styles.djCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/dj/${d.id}`)}
            >
              <Image source={{ uri: d.image_url }} style={styles.djImg} />
              <LinearGradient
                colors={["transparent", "rgba(5,5,5,0.85)"]}
                style={styles.djOverlay}
              />
              {d.verified_by_mauro ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
              <View style={styles.djBody}>
                <Text style={styles.djName} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.djCity}>{d.city} - {d.followers.toLocaleString("it-IT")} fans</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Latest playlists */}
        <SectionHeader title="Playlist scelte per voi" onSeeAll={() => router.push("/(tabs)/music")} />
        <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
          {playlists.slice(0, 3).map((m) => (
            <TouchableOpacity
              key={m.id}
              testID={`home-playlist-${m.id}`}
              style={styles.mixRow}
              activeOpacity={0.9}
              onPress={() => router.push(`/playlist/${m.id}`)}
            >
              <Image source={{ uri: m.cover_url }} style={styles.mixImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mixTitle} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.mixMeta} numberOfLines={1}>{m.curator} - {m.genre}</Text>
              </View>
              <View style={styles.mixPlay}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} hitSlop={6}>
          <Text style={styles.sectionSee}>Vedi tutti</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerPage: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 440, backgroundColor: "#111", overflow: "hidden" },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  brandMini: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: -0.8,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-black" }),
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  heroBadgeText: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  heroBottom: { position: "absolute", bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  heroKicker: { color: colors.gold, letterSpacing: 2, fontSize: 11, fontWeight: "800", marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  heroMeta: { color: colors.textSecondary, marginTop: 6, fontSize: 13 },
  heroCta: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  heroCtaText: { color: "#fff", fontWeight: "800" },
  greet: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  greetHi: { color: "#fff", fontSize: 24, fontWeight: "800" },
  greetSub: { color: colors.textSecondary, marginTop: 4 },
  radioWidget: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  radioArt: { width: 64, height: 64, borderRadius: 14 },
  radioKicker: { color: colors.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  radioTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 2 },
  radioMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sectionSee: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  evtCard: {
    width: 260,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  evtImg: { width: "100%", height: 160, backgroundColor: "#222" },
  evtBody: { padding: 14 },
  evtDate: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  evtTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 4 },
  evtGenre: { color: colors.textSecondary, fontSize: 11, marginTop: 6, letterSpacing: 1, fontWeight: "700" },
  boostBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  boostBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  djCard: {
    width: 160,
    height: 220,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  djImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  djOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 120 },
  djBody: { position: "absolute", bottom: 12, left: 12, right: 12 },
  djName: { color: "#fff", fontWeight: "800", fontSize: 15 },
  djCity: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  verifiedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  verifiedText: { color: colors.gold, fontSize: 10, fontWeight: "800" },
  mixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mixImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#222" },
  mixTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  mixMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  mixPlay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
