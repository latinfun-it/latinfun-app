import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandHeader from "../../src/BrandHeader";
import FavoriteHeart from "../../src/FavoriteHeart";
import AdminDeleteCorner from "../../src/AdminDeleteCorner";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n } from "../../src/i18n";
import type { EventItem } from "../../src/types";
import EventsMap from "../../src/EventsMap";

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

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function EventsScreen() {
  const router = useRouter();
  const { t, lang, country } = useI18n();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [genre, setGenre] = useState("all");
  const [city, setCity] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const autoLocated = useRef(false);

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

  // Auto-detect user's city on first mount (only once)
  useEffect(() => {
    if (autoLocated.current) return;
    if (cities.length === 0) return;
    autoLocated.current = true;
    (async () => {
      try {
        if (Platform.OS === "web") return; // web geocoding handled differently, skip for MVP
        setGeoStatus("loading");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGeoStatus("denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const place = places[0];
        const rawCity = place?.city || place?.subregion || place?.region;
        if (!rawCity) {
          setGeoStatus("ok");
          return;
        }
        const match = cities.find(
          (c) => normalize(c) === normalize(rawCity)
        );
        setDetectedCity(rawCity);
        setGeoStatus("ok");
        if (match && !city) {
          setCity(match);
        }
      } catch {
        setGeoStatus("denied");
      }
    })();
  }, [cities, city]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredEvents = useMemo(() => {
    if (!query.trim()) return events;
    const q = normalize(query);
    return events.filter(
      (e) =>
        normalize(e.title).includes(q) ||
        normalize(e.city).includes(q) ||
        normalize(e.venue).includes(q) ||
        e.lineup.some((dj) => normalize(dj).includes(q))
    );
  }, [events, query]);

  const citySuggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const nq = normalize(q);
    return cities.filter((c) => normalize(c).includes(nq)).slice(0, 6);
  }, [cities, query]);

  const pickCity = (c: string | null) => {
    setCity(c);
    setQuery("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="events-screen">
      <BrandHeader />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("events.title")}</Text>
            <Text style={styles.subtitle}>
              {country === "ES" ? (lang === "es" ? "La escena latina en toda España" : "La scena latina in tutta la Spagna") : (lang === "es" ? "La escena latina en toda Italia" : "La scena latina in tutta Italia")}
            </Text>
          </View>
          <View style={styles.toggle}>
            <TouchableOpacity
              testID="view-list"
              onPress={() => setView("list")}
              style={[styles.toggleBtn, view === "list" && styles.toggleBtnActive]}
            >
              <Ionicons name="list" size={16} color={view === "list" ? "#fff" : colors.textSecondary} />
              <Text style={[styles.toggleText, view === "list" && styles.toggleTextActive]}>{t("events.list")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="view-map"
              onPress={() => setView("map")}
              style={[styles.toggleBtn, view === "map" && styles.toggleBtnActive]}
            >
              <Ionicons name="map" size={16} color={view === "map" ? "#fff" : colors.textSecondary} />
              <Text style={[styles.toggleText, view === "map" && styles.toggleTextActive]}>{t("events.map")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search input */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            testID="events-search"
            placeholder={t("events.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (citySuggestions.length === 1) pickCity(citySuggestions[0]);
            }}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              testID="events-search-clear"
              onPress={() => setQuery("")}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Location banner */}
        {city ? (
          <View style={styles.locationBanner} testID="location-banner">
            <Ionicons name="location" size={14} color={colors.brand} />
            <Text style={styles.locationText} numberOfLines={1}>
              {detectedCity && normalize(detectedCity) === normalize(city)
                ? `Vicino a te: ${city}`
                : `Filtrando: ${city}`}
            </Text>
            <TouchableOpacity
              testID="location-reset"
              onPress={() => pickCity(null)}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : geoStatus === "loading" ? (
          <View style={styles.locationBanner}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.locationText}>Rilevo la tua posizione...</Text>
          </View>
        ) : geoStatus === "denied" ? (
          <TouchableOpacity
            testID="enable-location"
            style={styles.locationBanner}
            onPress={async () => {
              if (Platform.OS === "web") {
                Alert.alert("Attiva la posizione nel tuo browser e ricarica.");
                return;
              }
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === "granted") {
                autoLocated.current = false;
                setGeoStatus("idle");
              }
            }}
          >
            <Ionicons name="locate" size={14} color={colors.gold} />
            <Text style={styles.locationText}>Attiva posizione per vedere eventi vicini</Text>
          </TouchableOpacity>
        ) : null}

        {/* Search suggestions (cities) */}
        {citySuggestions.length > 0 ? (
          <View style={styles.suggestBox}>
            <Text style={styles.suggestTitle}>Citta</Text>
            {citySuggestions.map((c) => (
              <TouchableOpacity
                key={c}
                testID={`suggest-${c}`}
                style={styles.suggestRow}
                onPress={() => pickCity(c)}
              >
                <Ionicons name="location-outline" size={16} color={colors.brand} />
                <Text style={styles.suggestText}>{c}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

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
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : view === "map" ? (
        <EventsMap events={filteredEvents} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 180,
            paddingTop: spacing.md,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: spacing.lg }}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Nessun evento trovato{query ? ` per "${query}"` : city ? ` a ${city}` : ""}
              </Text>
              <Text style={styles.emptySub}>Prova a cambiare filtro o citta</Text>
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
              <View style={styles.heartCorner} pointerEvents="box-none">
                <FavoriteHeart kind="event" entityId={item.id} />
                <AdminDeleteCorner
                  kind="event"
                  entityId={item.id}
                  entityName={item.title}
                  onDeleted={load}
                />
              </View>
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
                  <Ionicons name="location" size={11} color={colors.textSecondary} />{" "}
                  {item.venue}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 4,
    gap: 10,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  toggleBtnActive: { backgroundColor: colors.brand },
  toggleText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  toggleTextActive: { color: "#fff" },
  title: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: colors.textSecondary, marginTop: 2 },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    fontSize: 14,
  },
  locationBanner: {
    marginHorizontal: spacing.lg,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: { color: "#fff", fontSize: 12, fontWeight: "600", flex: 1 },
  suggestBox: {
    marginHorizontal: spacing.lg,
    marginTop: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  suggestTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestText: { flex: 1, color: "#fff", fontWeight: "600" },
  pillsRow: { paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 8 },
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
  emptyText: { color: "#fff", marginTop: 14, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptySub: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
  heartCorner: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 5,
  },
});
