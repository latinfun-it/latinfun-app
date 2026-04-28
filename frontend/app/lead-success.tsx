import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { colors, radii, spacing } from "../src/theme";

export default function LeadSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!session_id) {
      setStatus("error");
      return;
    }
    const check = async () => {
      try {
        const r = await api.get<any>(`/payments/status/${session_id}`);
        if (r.data?.payment_status === "paid") {
          setStatus("paid");
          return;
        }
        if (tries < 8) {
          setTimeout(() => setTries((t) => t + 1), 1500);
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("error");
      }
    };
    check();
  }, [session_id, tries]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg }}>
        {status === "loading" ? (
          <>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={s.title}>Verifica pagamento...</Text>
            <Text style={s.sub}>Un momento</Text>
          </>
        ) : status === "paid" ? (
          <>
            <View style={[s.iconBox, { backgroundColor: "#5BCC8A22" }]}>
              <Ionicons name="checkmark-circle" size={56} color="#5BCC8A" />
            </View>
            <Text style={s.title}>Lead sbloccato! 🎉</Text>
            <Text style={s.sub}>
              Ora puoi vedere email e telefono dello studente.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/school/leads" as any)}
              style={s.btn}
              activeOpacity={0.9}
            >
              <Text style={s.btnText}>Vai ai tuoi lead</Text>
            </TouchableOpacity>
          </>
        ) : status === "pending" ? (
          <>
            <View style={[s.iconBox, { backgroundColor: colors.gold + "22" }]}>
              <Ionicons name="time-outline" size={56} color={colors.gold} />
            </View>
            <Text style={s.title}>Pagamento in elaborazione</Text>
            <Text style={s.sub}>
              Il lead verrà sbloccato a breve. Ricarica la pagina dei lead tra qualche minuto.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/school/leads" as any)}
              style={s.btn}
            >
              <Text style={s.btnText}>Vai ai lead</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[s.iconBox, { backgroundColor: "#FF315422" }]}>
              <Ionicons name="alert-circle" size={56} color="#FF3154" />
            </View>
            <Text style={s.title}>Errore</Text>
            <Text style={s.sub}>Impossibile verificare il pagamento.</Text>
            <TouchableOpacity onPress={() => router.replace("/school/leads" as any)} style={s.btn}>
              <Text style={s.btnText}>Torna ai lead</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  iconBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center" },
  sub: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
  btn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: radii.pill,
    marginTop: 30,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
