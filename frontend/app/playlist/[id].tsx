import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import FavoriteHeart from "../../src/FavoriteHeart";
import type { Playlist } from "../../src/types";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<Playlist>(`/playlists/${id}`);
        setP(r.data);
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
  if (!p) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Playlist non trovata</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="playlist-detail">
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={styles.hero}>
          <Image source={{ uri: p.cover_url }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={["rgba(5,5,5,0.2)", "rgba(5,5,5,0.7)", "#050505"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <View style={styles.topRow}>
              <TouchableOpacity
                testID="playlist-back"
                onPress={() => router.back()}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.heartBtn}>
                <FavoriteHeart kind="playlist" entityId={p.id} size={22} />
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.kicker}>PLAYLIST - {p.platform.toUpperCase()}</Text>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.curator}>Curata da {p.curator}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.desc}>{p.description}</Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="musical-note" size={11} color={colors.brand} />
              <Text style={styles.chipText}>{p.genre}</Text>
            </View>
            <View style={[styles.chip, { borderColor: "#1DB954" }]}>
              <Ionicons name="logo-apple-appstore" size={11} color="#1DB954" />
              <Text style={[styles.chipText, { color: "#fff" }]}>{p.platform}</Text>
            </View>
          </View>

          {/* Spotify embed */}
          {Platform.OS !== "web" && p.platform === "spotify" ? (
            <View style={styles.embedBox}>
              <WebView
                source={{ uri: p.embed_url }}
                style={styles.embed}
                allowsInlineMediaPlayback
                javaScriptEnabled
                domStorageEnabled
                mediaPlaybackRequiresUserAction={false}
              />
            </View>
          ) : null}

          <TouchableOpacity
            testID="open-external"
            style={styles.openBtn}
            activeOpacity={0.9}
            onPress={() => Linking.openURL(p.external_url)}
          >
            <Ionicons name="open" size={18} color="#fff" />
            <Text style={styles.openText}>Apri su {p.platform}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 340, overflow: "hidden", backgroundColor: "#111" },
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heartBtn: {
    margin: spacing.md,
  },
  heroBottom: { position: "absolute", bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  kicker: { color: colors.brand, fontSize: 11, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -0.8, marginTop: 6 },
  curator: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  body: { padding: spacing.lg, gap: spacing.lg },
  desc: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  embedBox: {
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    height: 380,
  },
  embed: { flex: 1, backgroundColor: "transparent" },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    shadowColor: colors.brand,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  openText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
