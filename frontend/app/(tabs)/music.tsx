import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandHeader from "../../src/BrandHeader";
import FavoriteHeart from "../../src/FavoriteHeart";
import AdminDeleteCorner from "../../src/AdminDeleteCorner";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n } from "../../src/i18n";
import type { Playlist } from "../../src/types";

const GENRES_BASE = [
  { key: "all" },
  { key: "bachata" },
  { key: "bachata sensual" },
  { key: "reggaeton" },
  { key: "salsa" },
  { key: "salsa cubana" },
  { key: "merengue" },
  { key: "dembow" },
  { key: "urban mix" },
  { key: "reparto" },
  { key: "latin" },
];

function localizedGenre(key: string, lang: string, t: (k: string) => string) {
  if (key === "all") return t("common.all");
  if (key === "bachata") return "Bachata";
  if (key === "bachata sensual") return lang === "es" ? "Bachata Sensual" : "Bachata Sensual";
  if (key === "reggaeton") return "Reggaeton";
  if (key === "salsa") return "Salsa";
  if (key === "salsa cubana") return lang === "es" ? "Salsa Cubana" : "Salsa Cubana";
  if (key === "merengue") return "Merengue";
  if (key === "dembow") return "Dembow";
  if (key === "urban mix") return "Urban Mix";
  if (key === "reparto") return "Reparto";
  if (key === "latin") return "Latin";
  return key;
}

export default function MusicScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [genre, setGenre] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params: any = {};
    if (genre && genre !== "all") params.genre = genre;
    const r = await api.get<Playlist[]>("/playlists", { params });
    setPlaylists(r.data);
    setLoading(false);
  }, [genre]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const hero = playlists.find((p) => p.featured) || playlists[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="music-screen">
      <BrandHeader />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/home" as any)}
              style={styles.backHomeBtn}
              testID="music-back-home"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{lang === "es" ? "LATINFUN MÚSICA" : "LATINFUN MUSICA"}</Text>
              <Text style={styles.title}>{t("music.title")}</Text>
              <Text style={styles.sub}>{t("music.subtitle")}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {GENRES_BASE.map((g) => {
            const active = genre === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                testID={`music-genre-${g.key}`}
                onPress={() => setGenre(g.key)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{localizedGenre(g.key, lang, t)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={playlists.filter((p) => !hero || p.id !== hero.id)}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 200 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            hero ? (
              <TouchableOpacity
                testID="hero-playlist"
                activeOpacity={0.92}
                onPress={() => router.push(`/playlist/${hero.id}`)}
                style={styles.hero}
              >
                <Image source={{ uri: hero.cover_url }} style={StyleSheet.absoluteFillObject} />
                <LinearGradient
                  colors={["rgba(5,5,5,0.1)", "rgba(5,5,5,0.75)", "#050505"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroBadge}>
                  <Ionicons name="star" size={11} color={colors.gold} />
                  <Text style={styles.heroBadgeText}>{t("music.pickOfWeek")}</Text>
                </View>
                <View style={styles.heroBottom}>
                  <Text style={styles.heroCurator}>AGGIORNATA OGNI SETTIMANA</Text>
                  <Text style={styles.heroTitle} numberOfLines={2}>{hero.title}</Text>
                  <Text style={styles.heroDesc} numberOfLines={2}>{hero.description}</Text>
                  <View style={styles.heroCta}>
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.heroCtaText}>{t("music.listenNow")}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : null
          }
          ListHeaderComponentStyle={{ marginBottom: 14 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: colors.textSecondary }}>Nessuna playlist per questo genere</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`playlist-row-${item.id}`}
              style={styles.row}
              activeOpacity={0.9}
              onPress={() => router.push(`/playlist/${item.id}`)}
            >
              <Image source={{ uri: item.cover_url }} style={styles.rowImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.genre.toUpperCase()} · AGGIORNATA OGNI SETTIMANA
                </Text>
                <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <View style={{ marginRight: 6 }}>
                <FavoriteHeart kind="playlist" entityId={item.id} size={18} />
              </View>
              <View style={{ marginRight: 6 }}>
                <AdminDeleteCorner
                  kind="playlist"
                  entityId={item.id}
                  entityName={item.title}
                  onDeleted={load}
                />
              </View>
              <View style={styles.rowBtn}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backHomeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  kicker: { color: colors.brand, fontSize: 11, letterSpacing: 2.5, fontWeight: "800" },
  title: { color: "#fff", fontSize: 32, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  pillsRow: { paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 8 },
  pill: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { color: colors.textSecondary, fontWeight: "700", fontSize: 13 },
  pillTextActive: { color: "#fff" },
  hero: {
    height: 260,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#111",
  },
  heroBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  heroBadgeText: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroBottom: { position: "absolute", bottom: 18, left: 18, right: 18 },
  heroCurator: { color: colors.gold, letterSpacing: 2, fontSize: 11, fontWeight: "800" },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, marginTop: 6 },
  heroDesc: { color: colors.textSecondary, marginTop: 6, fontSize: 13 },
  heroCta: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  heroCtaText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowImg: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#222" },
  rowTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  rowMeta: { color: colors.brand, fontSize: 11, marginTop: 2, letterSpacing: 1, fontWeight: "700" },
  rowDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  rowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
