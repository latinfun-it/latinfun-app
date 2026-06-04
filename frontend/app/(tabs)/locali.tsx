import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandHeader from "../../src/BrandHeader";
import FavoriteHeart from "../../src/FavoriteHeart";
import AdminDeleteCorner from "../../src/AdminDeleteCorner";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n } from "../../src/i18n";
import type { Locale } from "../../src/types";

const CATEGORIES = [
  { key: "all", labelIt: "Tutti", labelEs: "Todos" },
  { key: "ristorante", labelIt: "Ristorante", labelEs: "Restaurante" },
  { key: "bar", labelIt: "Bar", labelEs: "Bar" },
  { key: "lounge", labelIt: "Lounge", labelEs: "Lounge" },
  { key: "discoteca_cena", labelIt: "Disco-Cena", labelEs: "Disco-Cena" },
  { key: "altro", labelIt: "Altro", labelEs: "Otro" },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function LocaliScreen() {
  const router = useRouter();
  const { t, lang, country } = useI18n();
  const { user } = useAuth();
  const [locali, setLocali] = useState<Locale[]>([]);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    const params: any = {};
    if (category !== "all") params.category = category;
    const effectiveCountry = country === "INT" ? null : (lang === "es" ? "ES" : "IT");
    if (effectiveCountry) params.country = effectiveCountry;
    try {
      const r = await api.get<Locale[]>("/locali", { params });
      setLocali(r.data);
    } catch (e) {
      setLocali([]);
    }
    setLoading(false);
  }, [category, country, lang]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = query.trim()
    ? locali.filter((s) => {
        const q = normalize(query);
        return (
          normalize(s.name).includes(q) ||
          normalize(s.city).includes(q) ||
          normalize(s.cuisine || "").includes(q)
        );
      })
    : locali;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="locali-screen">
      <BrandHeader />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/home" as any)}
            style={styles.backHomeBtn}
            testID="locali-back-home"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{lang === "es" ? "DÓNDE VIBRAR" : "DOVE VIBRARE"}</Text>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {t("locali.title")}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {t("locali.subtitle")}
            </Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity
              testID="admin-locali-btn"
              style={styles.ctaBtn}
              onPress={() => router.push("/admin/locali" as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.ctaText}>{t("locali.addNew")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            testID="locali-search"
            placeholder={t("locali.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {CATEGORIES.map((g) => {
            const active = category === g.key;
            const label = lang === "es" ? g.labelEs : g.labelIt;
            return (
              <TouchableOpacity
                key={g.key}
                testID={`locale-cat-${g.key}`}
                onPress={() => setCategory(g.key)}
                style={[styles.pill, active && styles.pillActive]}
              >
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
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: 180,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="restaurant-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {t("locali.noResults")}
              </Text>
              {isAdmin ? (
                <TouchableOpacity
                  testID="empty-add-locale"
                  style={[styles.ctaBtn, { marginTop: 16 }]}
                  onPress={() => router.push("/admin/locali" as any)}
                >
                  <Text style={styles.ctaText}>{t("locali.addNew")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`locale-card-${item.id}`}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => router.push(`/locale/${item.id}` as any)}
            >
              <Image source={{ uri: item.image_url }} style={styles.img} />
              <LinearGradient
                colors={["transparent", "rgba(5,5,5,0.92)"]}
                style={styles.grad}
              />
              <View style={styles.heartCorner} pointerEvents="box-none">
                <FavoriteHeart kind={"locale" as any} entityId={item.id} />
                <AdminDeleteCorner
                  kind={"locale" as any}
                  entityId={item.id}
                  entityName={item.name}
                  onDeleted={load}
                />
              </View>
              {item.boosted ? (
                <View style={styles.boostBadge}>
                  <Ionicons name="rocket" size={11} color="#fff" />
                  <Text style={styles.boostBadgeText}>BOOST</Text>
                </View>
              ) : null}
              {item.verified_by_mauro ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              ) : null}
              <View style={styles.body}>
                <Text style={styles.city}>{item.city.toUpperCase()} · {(item.cuisine || "").toUpperCase()}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {(item.price_range ? item.price_range + " · " : "")}
                  {item.address}
                </Text>
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
    gap: 12,
  },
  backHomeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, alignSelf: "flex-end", marginBottom: 4 },
  kicker: { color: colors.brand, fontSize: 11, letterSpacing: 2.2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -0.8, marginTop: 2 },
  subtitle: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, color: "#fff", paddingVertical: 12, fontSize: 14 },
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
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: "#111",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  grad: { position: "absolute", left: 0, right: 0, bottom: 0, height: "80%" },
  body: { position: "absolute", bottom: 14, left: 14, right: 14 },
  city: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  name: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4, letterSpacing: -0.4 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  verifiedBadge: {
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
  verifiedText: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
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
  boostBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  emptyText: { color: "#fff", marginTop: 14, fontSize: 15, fontWeight: "700", textAlign: "center" },
  heartCorner: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 5,
  },
});
