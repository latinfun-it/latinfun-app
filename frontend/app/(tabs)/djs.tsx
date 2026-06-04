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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandHeader from "../../src/BrandHeader";
import FavoriteHeart from "../../src/FavoriteHeart";
import AdminDeleteCorner from "../../src/AdminDeleteCorner";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n } from "../../src/i18n";
import type { DJ } from "../../src/types";

export default function DjsScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params: any = {};
    if (onlyVerified) params.verified = true;
    params.country = lang === "es" ? "ES" : "IT";
    const r = await api.get<DJ[]>("/djs", { params });
    setDjs(r.data);
    setLoading(false);
  }, [onlyVerified, lang]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="djs-screen">
      <BrandHeader />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/home" as any)}
            style={styles.backHomeBtn}
            testID="djs-back-home"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("djs.title")}</Text>
            <Text style={styles.subtitle}>{t("djs.subtitle")}</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          <TouchableOpacity
            testID="filter-all-djs"
            onPress={() => setOnlyVerified(false)}
            style={[styles.pill, !onlyVerified && styles.pillActive]}
          >
            <Text style={[styles.pillText, !onlyVerified && styles.pillTextActive]}>{t("common.all")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="filter-verified-djs"
            onPress={() => setOnlyVerified(true)}
            style={[styles.pill, onlyVerified && styles.pillActive]}
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={onlyVerified ? "#fff" : colors.gold}
            />
            <Text style={[styles.pillText, onlyVerified && styles.pillTextActive]}>
              LatinFun Verified
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={djs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 180,
            paddingTop: spacing.md,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                testID={`dj-card-${item.id}`}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push(`/dj/${item.id}`)}
              >
                <Image source={{ uri: item.image_url }} style={styles.img} />
                <LinearGradient
                  colors={["transparent", "rgba(5,5,5,0.9)"]}
                  style={styles.grad}
                />
                {item.boosted ? (
                  <View style={styles.boostedCorner}>
                    <Ionicons name="rocket" size={11} color="#050505" />
                    <Text style={styles.boostedText}>BOOST</Text>
                  </View>
                ) : null}
                {item.verified_by_mauro ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                  </View>
                ) : null}
                <View style={styles.heartCorner} pointerEvents="box-none">
                  <FavoriteHeart kind="dj" entityId={item.id} />
                  <AdminDeleteCorner
                    kind="dj"
                    entityId={item.id}
                    entityName={item.name}
                    onDeleted={load}
                  />
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.city}>{item.city}</Text>
                  <View style={styles.genres}>
                    {item.genres.slice(0, 2).map((g) => (
                      <View key={g} style={styles.genreTag}>
                        <Text style={styles.genreTagText}>{g}</Text>
                      </View>
                    ))}
                  </View>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: 10 },
  backHomeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: colors.textSecondary, marginTop: 2 },
  pillsRow: { paddingHorizontal: spacing.lg, paddingVertical: 8, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { color: colors.textSecondary, fontWeight: "700", fontSize: 13 },
  pillTextActive: { color: "#fff" },
  card: {
    flex: 1,
    aspectRatio: 0.78,
    borderRadius: radii.lg,
    backgroundColor: "#111",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  grad: { position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" },
  verifiedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: radii.pill,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  rankBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rankText: { color: "#050505", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  boostedCorner: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 2,
  },
  boostedText: { color: "#050505", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  body: { position: "absolute", bottom: 12, left: 12, right: 12 },
  name: { color: "#fff", fontWeight: "800", fontSize: 16 },
  city: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  genres: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  genreTag: {
    backgroundColor: "rgba(225,29,72,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  genreTagText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  heartCorner: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 5,
  },
});
