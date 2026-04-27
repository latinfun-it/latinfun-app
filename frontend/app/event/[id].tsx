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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/auth";
import FavoriteButton from "../../src/FavoriteButton";
import DeleteButton from "../../src/DeleteButton";
import ReviewsSection from "../../src/ReviewsSection";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [packages, setPackages] = useState<{ key: string; days: number; price: number; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<EventItem>(`/events/${id}`);
        setEv(r.data);
      } finally {
        setLoading(false);
      }
    })();
    api.get("/boost/packages").then((r) => setPackages(r.data)).catch(() => {});
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

  const onBoost = async (pkgKey: string) => {
    setBoostLoading(true);
    try {
      const origin =
        Platform.OS === "web"
          ? (typeof window !== "undefined" ? window.location.origin : "")
          : (process.env.EXPO_PUBLIC_BACKEND_URL || "");
      const r = await api.post(`/events/${ev.id}/boost`, { origin_url: origin, package: pkgKey });
      const url = r.data.checkout_url as string;
      setPickerOpen(false);
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

          {user ? (
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <FavoriteButton
                kind="event"
                entityId={ev.id}
                initialCount={ev.likes || 0}
              />
            </View>
          ) : null}

          {canBoost ? (
            <View style={styles.boostBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.boostKicker}>BOOST - DA 4,99 EUR</Text>
                <Text style={styles.boostDesc}>
                  Promuovi questo evento: appare in cima alla lista con badge BOOST per la
                  durata scelta (1 settimana, 1 mese, 3/6 mesi o 1 anno).
                </Text>
              </View>
              <TouchableOpacity
                testID="boost-btn"
                style={styles.boostInline}
                activeOpacity={0.9}
                onPress={() => setPickerOpen(true)}
                disabled={boostLoading}
              >
                {boostLoading ? (
                  <ActivityIndicator color="#050505" />
                ) : (
                  <>
                    <Ionicons name="flame" size={16} color="#050505" />
                    <Text style={styles.boostInlineText}>Promuovi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {ev.boosted ? (
            <View style={styles.boostedBadge} testID="boosted-badge">
              <Ionicons name="flame" size={14} color={colors.gold} />
              <Text style={styles.boostedText}>EVENTO GIA PROMOSSO</Text>
            </View>
          ) : null}

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

          <DeleteButton
            kind="event"
            entityId={ev.id}
            entityName={ev.title}
            visible={user?.role === "admin"}
          />

          <ReviewsSection kind="event" targetId={ev.id} />
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Scegli il pacchetto BOOST</Text>
            <Text style={styles.sheetSub}>
              Prezzo unico, niente rinnovi automatici. Paghi una volta, il tuo evento resta in evidenza
              per la durata scelta.
            </Text>
            {packages.map((p) => {
              const perDay = p.price / p.days;
              const best = p.key === "six_months";
              return (
                <TouchableOpacity
                  key={p.key}
                  testID={`boost-pkg-${p.key}`}
                  style={[styles.pkgRow, best && styles.pkgRowBest]}
                  activeOpacity={0.85}
                  disabled={boostLoading}
                  onPress={() => onBoost(p.key)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.pkgLabel}>{p.label}</Text>
                      {best ? (
                        <View style={styles.bestBadge}>
                          <Text style={styles.bestBadgeText}>MIGLIORE OFFERTA</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.pkgMeta}>
                      {p.days} giorni - {perDay.toFixed(2).replace(".", ",")} EUR/giorno
                    </Text>
                  </View>
                  <Text style={styles.pkgPrice}>
                    {p.price.toFixed(2).replace(".", ",")} EUR
                  </Text>
                </TouchableOpacity>
              );
            })}
            {boostLoading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 12 }} /> : null}
            <TouchableOpacity
              testID="boost-close"
              onPress={() => setPickerOpen(false)}
              style={styles.sheetCancel}
            >
              <Text style={styles.sheetCancelText}>Annulla</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  boostBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 4,
  },
  boostKicker: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  boostDesc: { color: "#fff", fontSize: 12, marginTop: 4, lineHeight: 17 },
  boostInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  boostInlineText: { color: "#050505", fontWeight: "900", fontSize: 13 },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F59E0B",
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginTop: 8,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#333",
    marginBottom: 14,
  },
  sheetTitle: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  sheetSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  pkgRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
  },
  pkgRowBest: {
    borderColor: colors.gold,
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  pkgLabel: { color: "#fff", fontSize: 15, fontWeight: "800" },
  pkgMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  pkgPrice: { color: colors.gold, fontSize: 16, fontWeight: "900", marginLeft: 12 },
  bestBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestBadgeText: { color: "#050505", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  sheetCancel: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 6,
  },
  sheetCancelText: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
});
