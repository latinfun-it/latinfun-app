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
import type { EventItem, DJ, Playlist, School } from "../../src/types";
import SponsorBanner from "../../src/SponsorBanner";
import FavoriteHeart from "../../src/FavoriteHeart";

// Banner fisso brand (immagine "testata sito") - dance club Latin notturno
const BRAND_BANNER =
  "https://images.pexels.com/photos/5192504/pexels-photo-5192504.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, d, s, p] = await Promise.all([
        api.get<EventItem[]>("/events", { params: { featured: true } }),
        api.get<DJ[]>("/djs"),
        api.get<School[]>("/schools"),
        api.get<Playlist[]>("/playlists"),
      ]);
      setEvents(e.data);
      setDjs(d.data);
      setSchools(s.data);
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
        {/* TESTATA FISSA - Brand Banner */}
        <View style={styles.banner} testID="brand-banner">
          <Image source={{ uri: BRAND_BANNER }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={["rgba(5,5,5,0.55)", "rgba(5,5,5,0.25)", "rgba(5,5,5,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerLogo}>
                LATIN<Text style={{ color: colors.brand }}>FUN</Text>
              </Text>
              <Text style={styles.bannerTagline}>
                Il punto di riferimento della scena Latin
              </Text>
              <View style={styles.bannerStrip}>
                <View style={styles.stripDot} />
                <Text style={styles.stripText}>EVENTI · DJ · SCUOLE · MUSICA</Text>
                <View style={styles.stripDot} />
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* 1 - SPONSOR */}
        <SponsorBanner position="home_top" />

        {/* 2 - TROVA PARTNER DI BALLO */}
        <TouchableOpacity
          testID="home-match-cta"
          activeOpacity={0.9}
          onPress={() => router.push("/dancer" as any)}
          style={styles.matchCta}
        >
          <View style={styles.matchCtaInner}>
            <View style={styles.matchIconBox}>
              <Ionicons name="heart" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchCtaKicker}>NOVITÀ</Text>
              <Text style={styles.matchCtaTitle}>Trova Partner di Ballo</Text>
              <Text style={styles.matchCtaSub}>
                Scopri ballerini vicino a te e fai match
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* 3 - EVENTI IN EVIDENZA */}
        <SectionHeader title="Eventi in evidenza" onSeeAll={() => router.push("/(tabs)/events")} />
        {events.length > 0 ? (
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
                <View style={styles.heartCorner}>
                  <FavoriteHeart kind="event" entityId={e.id} size={18} />
                </View>
                <View style={styles.evtBody}>
                  <Text style={styles.evtDate}>{formatDate(e.date)} · {e.city}</Text>
                  <Text style={styles.evtTitle} numberOfLines={2}>{e.title}</Text>
                  <Text style={styles.evtGenre}>{e.genre.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptyState text="Nessun evento in evidenza" />
        )}

        {/* 4 - SCUOLE DI BALLO */}
        <SectionHeader title="Scuole di ballo" onSeeAll={() => router.push("/(tabs)/schools")} />
        {schools.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 14 }}
          >
            {schools.slice(0, 10).map((s) => (
              <TouchableOpacity
                key={s.id}
                testID={`home-school-${s.id}`}
                style={styles.schoolCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/school/${s.id}`)}
              >
                <Image source={{ uri: s.image_url }} style={styles.schoolImg} />
                <LinearGradient
                  colors={["transparent", "rgba(5,5,5,0.9)"]}
                  style={styles.schoolOverlay}
                />
                {s.boosted ? (
                  <View style={styles.boostBadge}>
                    <Ionicons name="flame" size={12} color="#fff" />
                    <Text style={styles.boostBadgeText}>BOOST</Text>
                  </View>
                ) : null}
                <View style={styles.heartCorner}>
                  <FavoriteHeart kind="school" entityId={s.id} size={18} />
                </View>
                <View style={styles.schoolBody}>
                  <Text style={styles.schoolName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.schoolCity} numberOfLines={1}>
                    {s.city} · {(s.styles || []).slice(0, 2).join(", ").toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptyState text="Nessuna scuola registrata" />
        )}

        {/* 5 - TOP DJ */}
        <SectionHeader title="Top DJ" onSeeAll={() => router.push("/(tabs)/djs")} />
        {djs.length > 0 ? (
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
                <View style={styles.heartCornerLeft}>
                  <FavoriteHeart kind="dj" entityId={d.id} size={18} />
                </View>
                <View style={styles.djBody}>
                  <Text style={styles.djName} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.djCity}>{d.city} · {d.followers.toLocaleString("it-IT")} fans</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptyState text="Nessun DJ disponibile" />
        )}

        {/* 6 - PLAYLIST SCELTE PER VOI */}
        <SectionHeader title="Playlist scelte per voi" onSeeAll={() => router.push("/(tabs)/music")} />
        {playlists.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
            {playlists.slice(0, 4).map((m) => (
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
                  <Text style={styles.mixMeta} numberOfLines={1}>
                    {m.genre.toUpperCase()} · aggiornata ogni settimana
                  </Text>
                </View>
                <View style={{ marginRight: 4 }}>
                  <FavoriteHeart kind="playlist" entityId={m.id} size={18} />
                </View>
                <View style={styles.mixPlay}>
                  <Ionicons name="play" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState text="Nessuna playlist disponibile" />
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={styles.sectionSee}>Vedi tutti</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerPage: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },

  // BRAND BANNER (testata fissa)
  banner: {
    height: 240,
    backgroundColor: "#0a0a0a",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  bannerLogo: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 56,
    letterSpacing: -2.5,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-black" }),
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  bannerTagline: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bannerStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderColor: colors.gold,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  stripDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
  stripText: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 2 },

  // MATCH CTA
  matchCta: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.brand,
  },
  matchCtaInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  matchIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  matchCtaKicker: { color: "rgba(255,255,255,0.85)", fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  matchCtaTitle: { color: "#fff", fontSize: 17, fontWeight: "900", marginTop: 2 },
  matchCtaSub: { color: "rgba(255,255,255,0.92)", fontSize: 12, marginTop: 2 },

  // SECTION HEADER
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

  // EVENT CARD
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

  // HEART OVERLAY (top-right card corner)
  heartCorner: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 5,
  },
  heartCornerLeft: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 5,
  },

  // SCHOOL CARD
  schoolCard: {
    width: 200,
    height: 150,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: colors.border,
  },
  schoolImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  schoolOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 90 },
  schoolBody: { position: "absolute", bottom: 12, left: 12, right: 12 },
  schoolName: { color: "#fff", fontWeight: "900", fontSize: 15 },
  schoolCity: { color: colors.gold, fontSize: 10, marginTop: 3, letterSpacing: 0.8, fontWeight: "700" },

  // DJ CARD
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

  // PLAYLIST ROW
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
  mixMeta: { color: colors.brand, fontSize: 11, marginTop: 2, letterSpacing: 0.6, fontWeight: "700" },
  mixPlay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  // EMPTY STATE
  empty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
});
