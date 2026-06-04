import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { colors, radii, spacing } from "./theme";

type Kind = "event" | "dj" | "school" | "locale";
type Pkg = { key: string; days: number; price: number; label: string };

const ENTITY_PATH: Record<Kind, string> = {
  event: "events",
  dj: "djs",
  school: "schools",
  locale: "locali",
};

const ENTITY_LABEL: Record<Kind, string> = {
  event: "evento",
  dj: "profilo DJ",
  school: "scuola",
  locale: "locale",
};

export default function BoostButton({
  kind,
  entityId,
  boosted,
  canBoost,
  compact = false,
}: {
  kind: Kind;
  entityId: string;
  boosted?: boolean;
  canBoost: boolean;
  compact?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canBoost || boosted) return;
    api.get<Pkg[]>("/boost/packages").then((r) => setPackages(r.data)).catch(() => {});
  }, [canBoost, boosted]);

  const onPick = async (pkgKey: string) => {
    setLoading(true);
    try {
      const origin =
        Platform.OS === "web"
          ? (typeof window !== "undefined" ? window.location.origin : "")
          : (process.env.EXPO_PUBLIC_BACKEND_URL || "");
      const r = await api.post(`/${ENTITY_PATH[kind]}/${entityId}/boost`, {
        origin_url: origin,
        package: pkgKey,
      });
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
      setLoading(false);
    }
  };

  if (boosted) {
    return (
      <View style={styles.boostedBadge} testID={`${kind}-boosted-badge`}>
        <Ionicons name="rocket" size={14} color={colors.gold} />
        <Text style={styles.boostedText}>
          {kind === "event" ? "EVENTO" : kind === "dj" ? "DJ" : "SCUOLA"} GIA PROMOSSO
        </Text>
      </View>
    );
  }

  if (!canBoost) return null;

  return (
    <>
      <View style={[styles.banner, compact && styles.bannerCompact]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>BOOST - DA 4,99 EUR</Text>
          <Text style={styles.desc}>
            Promuovi il tuo {ENTITY_LABEL[kind]}: appare in cima alla lista con badge BOOST per la
            durata scelta (1 settimana, 1 mese, 3/6 mesi o 1 anno).
          </Text>
        </View>
        <TouchableOpacity
          testID={`${kind}-boost-btn`}
          style={styles.inlineBtn}
          activeOpacity={0.9}
          onPress={() => setPickerOpen(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#050505" />
          ) : (
            <>
              <Ionicons name="rocket" size={16} color="#050505" />
              <Text style={styles.inlineText}>Promuovi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Scegli il pacchetto BOOST</Text>
            <Text style={styles.sheetSub}>
              Prezzo unico, niente rinnovi automatici. Paghi una volta, il tuo {ENTITY_LABEL[kind]} resta
              in evidenza per la durata scelta.
            </Text>
            {packages.map((p) => {
              const perDay = p.price / p.days;
              const best = p.key === "six_months";
              return (
                <TouchableOpacity
                  key={p.key}
                  testID={`${kind}-boost-pkg-${p.key}`}
                  style={[styles.pkgRow, best && styles.pkgRowBest]}
                  activeOpacity={0.85}
                  disabled={loading}
                  onPress={() => onPick(p.key)}
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
            {loading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 12 }} /> : null}
            <TouchableOpacity
              testID={`${kind}-boost-close`}
              onPress={() => setPickerOpen(false)}
              style={styles.sheetCancel}
            >
              <Text style={styles.sheetCancelText}>Annulla</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    padding: 14,
  },
  bannerCompact: { padding: 10 },
  kicker: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  desc: { color: "#fff", fontSize: 12, marginTop: 4, lineHeight: 17 },
  inlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  inlineText: { color: "#050505", fontWeight: "900", fontSize: 13 },
  boostedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: 12,
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  boostedText: { color: colors.gold, fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
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
  sheetCancel: { alignItems: "center", paddingVertical: 12, marginTop: 6 },
  sheetCancelText: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
});
