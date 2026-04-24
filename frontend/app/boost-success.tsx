import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { colors, radii, spacing } from "../src/theme";

export default function BoostSuccess() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [status, setStatus] = useState<"checking" | "paid" | "failed" | "expired">("checking");
  const [eventId, setEventId] = useState<string | null>(null);

  const poll = useCallback(
    async (attempts = 0) => {
      if (!session_id) {
        setStatus("failed");
        return;
      }
      if (attempts >= 8) {
        setStatus("expired");
        return;
      }
      try {
        const r = await api.get(`/payments/status/${session_id}`);
        if (r.data.event_id) setEventId(r.data.event_id);
        if (r.data.payment_status === "paid") {
          setStatus("paid");
          return;
        }
        if (r.data.status === "expired") {
          setStatus("expired");
          return;
        }
        setTimeout(() => poll(attempts + 1), 2200);
      } catch {
        setTimeout(() => poll(attempts + 1), 2500);
      }
    },
    [session_id]
  );

  useEffect(() => {
    poll();
  }, [poll]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="boost-success">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.c}>
          {status === "checking" ? (
            <>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.title}>Conferma pagamento...</Text>
              <Text style={styles.sub}>Sto verificando con Stripe</Text>
            </>
          ) : status === "paid" ? (
            <>
              <View style={styles.iconOk}>
                <Ionicons name="checkmark" size={44} color="#fff" />
              </View>
              <Text style={styles.title}>Evento promosso!</Text>
              <Text style={styles.sub}>
                Il tuo evento appare ora con il badge BOOST e sara spinto tra i primi risultati.
              </Text>
              <TouchableOpacity
                testID="boost-go-event"
                style={styles.cta}
                onPress={() => (eventId ? router.replace(`/event/${eventId}`) : router.replace("/(tabs)/events"))}
              >
                <Text style={styles.ctaText}>Vedi il tuo evento</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.iconOk, { backgroundColor: colors.error }]}>
                <Ionicons name="close" size={44} color="#fff" />
              </View>
              <Text style={styles.title}>Pagamento non riuscito</Text>
              <Text style={styles.sub}>La sessione e scaduta o stata annullata. Riprova.</Text>
              <TouchableOpacity
                testID="boost-retry"
                style={styles.cta}
                onPress={() => router.replace("/(tabs)/events")}
              >
                <Text style={styles.ctaText}>Torna agli eventi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 16, textAlign: "center" },
  sub: { color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  iconOk: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    marginTop: spacing.lg,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
