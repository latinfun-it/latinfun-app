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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { usePlayer } from "../../src/player";
import type { Mix } from "../../src/types";

const GENRES = [
  { key: "all", label: "Tutti" },
  { key: "bachata", label: "Bachata" },
  { key: "reggaeton", label: "Reggaeton" },
  { key: "salsa", label: "Salsa" },
  { key: "latin", label: "Latin" },
];

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  return `${m} min`;
}

export default function RadioScreen() {
  const { currentMix, play, toggle, isPlaying, position, duration } = usePlayer();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [genre, setGenre] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params: any = {};
    if (genre && genre !== "all") params.genre = genre;
    const r = await api.get<Mix[]>("/mixes", { params });
    setMixes(r.data);
    setLoading(false);
  }, [genre]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="radio-screen">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.kicker}>LATINHUB RADIO</Text>
          <Text style={styles.title}>Mega Mix & DJ Sets</Text>
        </View>
      </SafeAreaView>

      {currentMix ? (
        <View style={styles.nowPlaying} testID="now-playing">
          <Image source={{ uri: currentMix.cover_url }} style={styles.npArt} />
          <LinearGradient
            colors={["rgba(225,29,72,0.35)", "rgba(5,5,5,0.0)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.npInfo}>
            <Text style={styles.npKicker}>ORA IN ONDA</Text>
            <Text style={styles.npTitle} numberOfLines={1}>{currentMix.title}</Text>
            <Text style={styles.npDj}>di {currentMix.dj_name}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          <TouchableOpacity testID="radio-toggle" style={styles.npBtn} onPress={toggle}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

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
              testID={`radio-genre-${g.key}`}
              onPress={() => setGenre(g.key)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={mixes}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const isActive = currentMix?.id === item.id;
            return (
              <TouchableOpacity
                testID={`mix-row-${item.id}`}
                style={[styles.row, isActive && styles.rowActive]}
                activeOpacity={0.9}
                onPress={() => play(item)}
              >
                <Image source={{ uri: item.cover_url }} style={styles.img} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.dj_name} - {item.genre} - {fmtDuration(item.duration_sec)}
                  </Text>
                  <Text style={styles.rowPlays}>{item.plays.toLocaleString("it-IT")} plays</Text>
                </View>
                <View style={[styles.rowBtn, isActive && styles.rowBtnActive]}>
                  <Ionicons
                    name={isActive && isPlaying ? "pause" : "play"}
                    size={18}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  kicker: { color: colors.brand, fontSize: 11, letterSpacing: 2.5, fontWeight: "800" },
  title: { color: "#fff", fontSize: 32, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  nowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing.lg,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.brand,
    overflow: "hidden",
    gap: 12,
  },
  npArt: { width: 72, height: 72, borderRadius: 14 },
  npInfo: { flex: 1 },
  npKicker: { color: colors.brand, fontSize: 10, letterSpacing: 1.8, fontWeight: "800" },
  npTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginTop: 2 },
  npDj: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brand },
  npBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  pillsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
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
  rowActive: { borderColor: colors.brand },
  img: { width: 60, height: 60, borderRadius: 10, backgroundColor: "#222" },
  rowTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  rowPlays: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBtnActive: { backgroundColor: colors.brand },
});
