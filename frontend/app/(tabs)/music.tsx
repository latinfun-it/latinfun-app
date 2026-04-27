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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import type { Playlist } from "../../src/types";

const GENRES = [
  { key: "all", label: "Tutte" },
  { key: "bachata", label: "Bachata" },
  { key: "reggaeton", label: "Reggaeton" },
  { key: "salsa", label: "Salsa" },
  { key: "latin", label: "Latin" },
];

export default function MusicScreen() {
  const router = useRouter();
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
          <Text style={styles.kicker}>LATINFUN MUSICA</Text>
          <Text style={styles.title}>Playlist</Text>
          <Text style={styles.sub}>Curate da Mauro Catalini - aggiornate ogni settimana</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {GENRES.map((g) => {
            const active = genre === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                testID={`music-genre-${g.key}`}
                onPress={() => setGenre(g.key)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{g.label}</Text>
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
                  <Text style={styles.heroBadgeText}>PICK DEL CURATORE</Text>
                </View>
                <View style={styles.heroBottom}>
                  <Text style={styles.heroCurator}>DI {hero.curator.toUpperCase()}</Text>
                  <Text style={styles.heroTitle} numberOfLines={2}>{hero.title}</Text>
                  <Text style={styles.heroDesc} numberOfLines={2}>{hero.description}</Text>
                  <View style={styles.heroCta}>
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.heroCtaText}>Ascolta ora</Text>
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
                  {item.genre.toUpperCase()} - {item.platform}
                </Text>
                <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
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
