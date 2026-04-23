import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import type { EventItem } from "../../src/types";

const GENRES = [
  { key: "all", label: "Tutti" },
  { key: "bachata", label: "Bachata" },
  { key: "reggaeton", label: "Reggaeton" },
  { key: "salsa", label: "Salsa" },
  { key: "latin", label: "Latin Mix" },
];

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [genre, setGenre] = useState("all");
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params: any = {};
    if (genre && genre !== "all") params.genre = genre;
    if (city) params.city = city;
    const [ev, ci] = await Promise.all([
      api.get<EventItem[]>("/events", { params }),
      api.get<string[]>("/cities"),
    ]);
    setEvents(ev.data);
    setCities(ci.data);
    setLoading(false);
  }, [genre, city]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const cityOptions = useMemo(() => [null, ...cities], [cities]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="events-screen">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Eventi</Text>
          <Text style={styles.subtitle}>La scena latina in tutta Italia</Text>
        </View>

        {/* Genre pills */}
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
                testID={`genre-${g.key}`}
                onPress={() => setGenre(g.key)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* City pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {cityOptions.map((c, idx) => {
            const active = city === c;
            const label = c ?? "Tutte le citta";
            return (
              <TouchableOpacity
                key={`${c}-${idx}`}
                testID={`city-${c ?? "all"}`}
                onPress={() => setCity(c)}
                style={[styles.pillCity, active && styles.pillCityActive]}
              >
                <Ionicons name="location" size={12} color={active ? "#fff" : colors.textSecondary} />
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 180, paddingTop: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ color: colors.textSecondary }}>Nessun evento trovato</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`event-card-${item.id}`}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => router.push(`/event/${item.id}`)}
            >
              <Image source={{ uri: item.image_url }} style={styles.cardImg} />
              {item.featured ? (
                <View style={styles.featBadge}>
                  <Ionicons name="star" size={11} color={colors.gold} />
                  <Text style={styles.featBadgeText}>FEATURED</Text>
                </View>
              ) : null}
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardCity}>{item.city.toUpperCase()}</Text>
                  <Text style={styles.cardGenre}>{item.genre.toUpperCase()}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardDate}>{formatDateLong(item.date)}</Text>
                <Text style={styles.cardVenue} numberOfLines={1}>
                  <Ionicons name="location" size={11} color={colors.textSecondary} /> {item.venue}
                </Text>
                {item.lineup.length ? (
                  <Text style={styles.cardLineup} numberOfLines={1}>
                    Line-up: {item.lineup.join(", ")}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: colors.textSecondary, marginTop: 2 },
  pillsRow: { paddingHorizontal: spacing.lg, paddingVertical: 8, gap: 8 },
  pill: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillCity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillCityActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { color: colors.textSecondary, fontWeight: "700", fontSize: 13 },
  pillTextActive: { color: "#fff" },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardImg: { width: "100%", height: 180, backgroundColor: "#222" },
  cardBody: { padding: 14 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  cardCity: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  cardGenre: { color: colors.brand, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardDate: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
  cardVenue: { color: colors.textSecondary, marginTop: 6, fontSize: 12 },
  cardLineup: { color: colors.textSecondary, marginTop: 4, fontSize: 12, fontStyle: "italic" },
  featBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  featBadgeText: { color: colors.gold, fontSize: 10, fontWeight: "800" },
});
