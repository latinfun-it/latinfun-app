import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

type Payout = {
  user: { id: string; name: string; email: string; referral_code: string };
  pending_total: number;
  pending_count: number;
};

export default function AdminReferralsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Payout[]>("/admin/referrals/payouts");
      setItems(r.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markPaid = (p: Payout) => {
    const confirmText = `Conferma di aver pagato €${p.pending_total.toFixed(
      2
    )} a ${p.user.name} (${p.user.email})?\n\n${p.pending_count} commissioni verranno marcate come pagate.`;
    const yes =
      Platform.OS === "web"
        ? // eslint-disable-next-line no-alert
          window.confirm(confirmText)
        : false;
    if (Platform.OS !== "web") {
      Alert.alert("Marca come pagato", confirmText, [
        { text: "Annulla", style: "cancel" },
        {
          text: "Conferma",
          onPress: async () => {
            await doMark(p);
          },
        },
      ]);
      return;
    }
    if (yes) {
      doMark(p);
    }
  };

  const doMark = async (p: Payout) => {
    setPaying(p.user.id);
    try {
      await api.post(`/admin/referrals/${p.user.id}/mark-paid`);
      setItems((prev) => prev.filter((x) => x.user.id !== p.user.id));
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Errore";
      if (Platform.OS === "web") window.alert("Errore: " + msg);
      else Alert.alert("Errore", msg);
    } finally {
      setPaying(null);
    }
  };

  const grandTotal = items.reduce((acc, p) => acc + p.pending_total, 0);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="admin-payouts-screen">
      <SafeAreaView edges={["top"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.title}>Pagamenti Affiliati</Text>
          <Text style={s.sub}>
            Totale da pagare: €{grandTotal.toFixed(2)}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <FlatList
        data={items}
        keyExtractor={(p) => p.user.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cash-outline" size={56} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Nessuna commissione da pagare</Text>
            <Text style={s.emptyHint}>
              Quando un utente porta nuovi iscritti che pagano, le commissioni appariranno qui.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{item.user.name}</Text>
                <Text style={s.userMeta}>
                  {item.user.email} · {item.user.referral_code}
                </Text>
              </View>
              <Text style={s.amount}>€{item.pending_total.toFixed(2)}</Text>
            </View>
            <Text style={s.count}>{item.pending_count} commissioni in attesa</Text>
            <TouchableOpacity
              onPress={() => markPaid(item)}
              disabled={paying === item.user.id}
              style={[s.payBtn, paying === item.user.id && { opacity: 0.5 }]}
              activeOpacity={0.85}
            >
              {paying === item.user.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                  <Text style={s.payText}>Marca come pagato</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sub: { color: colors.gold, fontSize: 12, fontWeight: "700", marginTop: 2 },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  userMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  amount: { color: "#5BCC8A", fontSize: 22, fontWeight: "900" },
  count: { color: colors.textMuted, fontSize: 11 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  payText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});
