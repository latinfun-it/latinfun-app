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
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/auth";
import type { EventItem } from "../../src/types";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [boostLoading, setBoostLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<EventItem>(`/events/${id}`);
        setEv(r.data);
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
  if (!ev) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Evento non trovato</Text>
      </View>
    );
  }

  const canBoost =
    !!user && !ev.boosted && (ev.owner_id === user.id || user.role === "admin");

  const onBoost = async () => {
    setBoostLoading(true);
    try {
      const origin =
        Platform.OS === "web"
          ? (typeof window !== "undefined" ? window.location.origin : "")
          : (process.env.EXPO_PUBLIC_BACKEND_URL || "");
      const r = await api.post(`/events/${ev.id}/boost`, { origin_url: origin });
      const url = r.data.checkout_url as string;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = url;
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    } finally {
      setBoostLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="event-detail">
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={styles.hero}>
          <Image source={{ uri: ev.image_url }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={["rgba(5,5,5,0.25)", "rgba(5,5,5,0.65)", "#050505"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <TouchableOpacity
              testID="back-btn"
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <View style={styles.row}>
              <Text style={styles.kicker}>{ev.city.toUpperCase()}</Text>
              <Text style={styles.kickerGenre}>{ev.genre.toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{ev.title}</Text>
            <Text style={styles.date}>{fmt(ev.date)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.infoTitle}>{ev.venue}</Text>
              <Text style={styles.infoSub}>{ev.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people" size={18} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Organizzato da</Text>
              <Text style={styles.infoSub}>{ev.organizer}</Text>
            </View>
          </View>

          {ev.lineup.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Line-up</Text>
              <View style={{ gap: 8 }}>
                {ev.lineup.map((name) => (
                  <View key={name} style={styles.lineupChip}>
                    <Ionicons name="disc" size={14} color={colors.gold} />
                    <Text style={styles.lineupText}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Info</Text>
            <Text style={styles.desc}>{ev.description}</Text>
          </View>

          {ev.ticket_url ? (
            <TouchableOpacity
              testID="ticket-btn"
              style={styles.ticketBtn}
              activeOpacity={0.9}
              onPress={() => Linking.openURL(ev.ticket_url!)}
            >
              <Ionicons name="ticket" size={18} color="#fff" />
              <Text style={styles.ticketText}>Prevendita & biglietti</Text>
            </TouchableOpacity>
          ) : null}

          {canBoost ? (
            <TouchableOpacity
              testID="boost-btn"
              style={styles.boostBtn}
              activeOpacity={0.9}
              onPress={onBoost}
              disabled={boostLoading}
            >
              {boostLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="flame" size={18} color="#fff" />
                  <Text style={styles.ticketText}>Promuovi (BOOST) - 9,99 EUR</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {ev.boosted ? (
            <View style={styles.boostedBadge} testID="boosted-badge">
              <Ionicons name="flame" size={14} color={colors.gold} />
              <Text style={styles.boostedText}>EVENTO PROMOSSO</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 420, overflow: "hidden", backgroundColor: "#111" },
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
  heroBottom: { position: "absolute", bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  row: { flexDirection: "row", gap: 10 },
  kicker: { color: colors.gold, letterSpacing: 2, fontSize: 11, fontWeight: "800" },
  kickerGenre: { color: colors.brand, letterSpacing: 2, fontSize: 11, fontWeight: "800" },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 8,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-black" }),
  },
  date: { color: colors.textSecondary, marginTop: 6 },
  body: { padding: spacing.lg, gap: 18 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  infoTitle: { color: "#fff", fontWeight: "700" },
  infoSub: { color: colors.textSecondary, marginTop: 2, fontSize: 12 },
  section: { marginTop: 6 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  lineupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineupText: { color: "#fff", fontWeight: "600" },
  desc: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  ticketBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  ticketText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F59E0B",
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  boostedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  boostedText: { color: colors.gold, fontWeight: "800", letterSpacing: 1 },
});
