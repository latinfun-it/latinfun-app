import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/auth";
import BoostButton from "../../src/BoostButton";
import FavoriteButton from "../../src/FavoriteButton";
import type { DJ, EventItem, Mix } from "../../src/types";

export default function DjDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [dj, setDj] = useState<DJ | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [djR, evR, mxR] = await Promise.all([
          api.get<DJ>(`/djs/${id}`),
          api.get<EventItem[]>(`/events`),
          api.get<Mix[]>(`/mixes`),
        ]);
        setDj(djR.data);
        setEvents(evR.data.filter((e) => e.lineup.includes(djR.data.name)));
        setMixes(mxR.data.filter((m) => m.dj_name === djR.data.name));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  if (!dj) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>DJ non trovato</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="dj-detail">
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={styles.hero}>
          <Image
            source={{ uri: dj.cover_url || dj.image_url }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={["rgba(5,5,5,0.25)", "rgba(5,5,5,0.7)", "#050505"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <TouchableOpacity
              testID="dj-back"
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.headerBlock}>
          <Image source={{ uri: dj.image_url }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.name}>{dj.name}</Text>
            <Text style={styles.city}>{dj.city} - Italia</Text>
            {dj.verified_by_mauro ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                <Text style={styles.verifiedText}>VERIFIED BY MAURO</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Fans" value={dj.followers.toLocaleString("it-IT")} />
          <Stat label="Eventi" value={String(events.length)} />
          <Stat label="Mix" value={String(mixes.length)} />
        </View>

        <View style={styles.body}>
          <Text style={styles.bio}>{dj.bio}</Text>

          <View style={styles.genreRow}>
            {dj.genres.map((g) => (
              <View key={g} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>

          <View style={styles.socialRow}>
            {user ? (
              <FavoriteButton
                kind="dj"
                entityId={dj.id}
                initialCount={dj.followers || 0}
              />
            ) : null}
            {dj.instagram ? (
              <TouchableOpacity
                testID="dj-instagram"
                style={styles.socialBtn}
                onPress={() => Linking.openURL(dj.instagram!)}
              >
                <Ionicons name="logo-instagram" size={18} color="#fff" />
                <Text style={styles.socialText}>Instagram</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ marginTop: 14 }}>
            <BoostButton
              kind="dj"
              entityId={dj.id}
              boosted={dj.boosted}
              canBoost={
                !!user && !dj.boosted && ((dj as any).owner_id === user.id || user.role === "admin")
              }
            />
          </View>

          {dj.spotify_playlist_url ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Playlist Spotify</Text>
              <View style={styles.embedBox}>
                {Platform.OS === "web" ? (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => Linking.openURL(dj.spotify_playlist_url!)}
                  >
                    <Ionicons name="musical-notes" size={18} color="#1DB954" />
                    <Text style={styles.linkBtnText}>Apri su Spotify</Text>
                  </TouchableOpacity>
                ) : (
                  <WebView
                    source={{ uri: dj.spotify_playlist_url }}
                    style={{ height: 360, backgroundColor: "transparent" }}
                    allowsInlineMediaPlayback
                  />
                )}
              </View>
            </View>
          ) : null}

          {dj.tidal_playlist_url ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Playlist Tidal</Text>
              <TouchableOpacity
                testID="tidal-link"
                style={styles.linkBtn}
                onPress={() => Linking.openURL(dj.tidal_playlist_url!)}
              >
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.linkBtnText}>Apri su Tidal</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {events.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prossimi eventi</Text>
              <View style={{ gap: 10 }}>
                {events.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    testID={`dj-event-${e.id}`}
                    style={styles.eventRow}
                    onPress={() => router.push(`/event/${e.id}`)}
                  >
                    <Image source={{ uri: e.image_url }} style={styles.eventImg} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={styles.eventMeta}>
                        {new Date(e.date).toLocaleDateString("it-IT")} - {e.city}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 260, overflow: "hidden", backgroundColor: "#111" },
  backBtn: {
    margin: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -56,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: colors.bg,
    backgroundColor: "#222",
  },
  name: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  city: { color: colors.textSecondary, marginTop: 2 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: 6,
  },
  verifiedText: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: "center",
  },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  statLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  body: { padding: spacing.lg, gap: spacing.lg },
  bio: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genreTag: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreText: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  socialRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  socialText: { color: "#fff", fontWeight: "700" },
  section: { gap: 10 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  embedBox: {
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkBtnText: { color: "#fff", fontWeight: "800" },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventImg: { width: 54, height: 54, borderRadius: 10 },
  eventTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  eventMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
