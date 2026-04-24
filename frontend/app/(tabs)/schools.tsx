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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import type { School } from "../../src/types";

const STYLES = [
  { key: "all", label: "Tutti" },
  { key: "bachata", label: "Bachata" },
  { key: "salsa", label: "Salsa" },
  { key: "reggaeton", label: "Reggaeton" },
  { key: "kizomba", label: "Kizomba" },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function SchoolsScreen() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [style, setStyle] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params: any = {};
    if (style !== "all") params.style = style;
    const r = await api.get<School[]>("/schools", { params });
    setSchools(r.data);
    setLoading(false);
  }, [style]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = query.trim()
    ? schools.filter((s) => {
        const q = normalize(query);
        return (
          normalize(s.name).includes(q) ||
          normalize(s.city).includes(q) ||
          s.styles.some((st) => normalize(st).includes(q))
        );
      })
    : schools;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="schools-screen">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>DOVE IMPARARE</Text>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              Scuole di Ballo
            </Text>
            <Text style={styles.subtitle}>Trova la tua academia preferita in Italia</Text>
          </View>
          <TouchableOpacity
            testID="register-school-btn"
            style={styles.ctaBtn}
            onPress={() => router.push("/school/register")}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.ctaText}>Aggiungi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            testID="schools-search"
            placeholder="Cerca scuola, citta, stile..."
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
          {STYLES.map((g) => {
            const active = style === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                testID={`school-style-${g.key}`}
                onPress={() => setStyle(g.key)}
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
              <Ionicons name="school-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Nessuna scuola trovata{query ? ` per "${query}"` : ""}
              </Text>
              <Text style={styles.emptySub}>Vuoi essere il primo maestro della tua citta?</Text>
              <TouchableOpacity
                testID="empty-register-school"
                style={[styles.ctaBtn, { marginTop: 16 }]}
                onPress={() => router.push("/school/register")}
              >
                <Text style={styles.ctaText}>Registra la tua scuola</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`school-card-${item.id}`}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => router.push(`/school/${item.id}`)}
            >
              <Image source={{ uri: item.image_url }} style={styles.img} />
              <LinearGradient
                colors={["transparent", "rgba(5,5,5,0.88)"]}
                style={styles.grad}
              />
              {item.verified_by_mauro ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              ) : null}
              <View style={styles.body}>
                <Text style={styles.city}>{item.city.toUpperCase()}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.students} studenti - {item.styles.slice(0, 3).join(", ")}
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
    height: 180,
    borderRadius: radii.lg,
    backgroundColor: "#111",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  grad: { position: "absolute", left: 0, right: 0, bottom: 0, height: "75%" },
  body: { position: "absolute", bottom: 14, left: 14, right: 14 },
  city: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  name: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 4, letterSpacing: -0.4 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4, textTransform: "capitalize" },
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
  emptyText: { color: "#fff", marginTop: 14, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptySub: { color: colors.textSecondary, marginTop: 4, fontSize: 12, textAlign: "center" },
});
