import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { colors, radii, spacing } from "../src/theme";
import BrandHeader from "../src/BrandHeader";

type DancerProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  city: string;
  age?: number;
  photo_url: string;
  styles: string[];
  level: string;
  looking_for: string[];
  instagram?: string;
};

export default function DancerDiscover() {
  const router = useRouter();
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<DancerProfile[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<DancerProfile | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const me = await api.get("/dancer/profile/me");
      if (!me.data) {
        setHasProfile(false);
        return;
      }
      setHasProfile(true);
      const r = await api.get<DancerProfile[]>("/dancer/discover");
      setProfiles(r.data || []);
      setIdx(0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const swipe = async (direction: "like" | "pass") => {
    const cur = profiles[idx];
    if (!cur) return;
    try {
      const r = await api.post<{ match: boolean; with_profile?: DancerProfile }>(
        `/dancer/${cur.user_id}/swipe`,
        { direction }
      );
      if (direction === "like" && r.data.match && r.data.with_profile) {
        setMatchModal(r.data.with_profile);
      }
    } catch {
      /* silent */
    }
    setIdx((i) => i + 1);
  };

  if (!user) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.bg }]}>
        <Text style={styles.dim}>Accedi per usare il match.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <BrandHeader />
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </View>
    );
  }

  if (hasProfile === false) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <BrandHeader />
        <SafeAreaView edges={["top"]} style={{ padding: spacing.lg }}>
          <Text style={styles.kicker}>MATCH PARTNER DI BALLO</Text>
          <Text style={styles.title}>Crea il tuo profilo ballerino</Text>
          <Text style={styles.dim}>
            Per scoprire altri ballerini e fare match, crea prima il tuo profilo.
          </Text>
          <TouchableOpacity
            testID="dancer-create-profile"
            style={styles.primaryBtn}
            onPress={() => router.push("/dancer/profile" as any)}
            activeOpacity={0.9}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.primaryText}>Crea profilo</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const cur = profiles[idx];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="dancer-discover">
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>BALLERINI VICINO A TE</Text>
            <Text style={styles.title}>Match</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/dancer/matches" as any)}
              style={styles.iconBtn}
              testID="go-matches"
            >
              <Ionicons name="people" size={20} color={colors.brand} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/dancer/profile" as any)}
              style={styles.iconBtn}
              testID="edit-profile"
            >
              <Ionicons name="person" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {!cur ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-done-circle" size={56} color={colors.brand} />
            <Text style={styles.endTitle}>Hai visto tutti per ora!</Text>
            <Text style={styles.dim}>Torna piu tardi per scoprire nuovi ballerini.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={load}
              activeOpacity={0.9}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryText}>Ricarica</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Image source={{ uri: cur.photo_url }} style={styles.cardImg} />
              <LinearGradient
                colors={["transparent", "rgba(5,5,5,0.95)"]}
                style={styles.grad}
              />
              <View style={styles.cardOverlay}>
                <Text style={styles.cardName}>
                  {cur.display_name}
                  {cur.age ? <Text style={styles.cardAge}>, {cur.age}</Text> : null}
                </Text>
                <Text style={styles.cardCity}>📍 {cur.city}</Text>
                <View style={styles.tagsRow}>
                  <View style={styles.levelTag}>
                    <Text style={styles.levelTagText}>{cur.level.toUpperCase()}</Text>
                  </View>
                  {(cur.styles || []).slice(0, 3).map((s) => (
                    <View key={s} style={styles.styleTag}>
                      <Text style={styles.styleTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {cur.bio ? (
              <View style={styles.bioBox}>
                <Text style={styles.bioLabel}>BIO</Text>
                <Text style={styles.bioText}>{cur.bio}</Text>
              </View>
            ) : null}

            {cur.looking_for && cur.looking_for.length > 0 ? (
              <View style={styles.bioBox}>
                <Text style={styles.bioLabel}>CERCO</Text>
                <View style={styles.tagsRow}>
                  {cur.looking_for.map((l) => (
                    <View key={l} style={styles.styleTag}>
                      <Text style={styles.styleTagText}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                testID="swipe-pass"
                style={[styles.actionBtn, styles.passBtn]}
                onPress={() => swipe("pass")}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                testID="swipe-like"
                style={[styles.actionBtn, styles.likeBtn]}
                onPress={() => swipe("like")}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Match Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={!!matchModal}
        onRequestClose={() => setMatchModal(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎉 È UN MATCH!</Text>
            {matchModal ? (
              <>
                <Image
                  source={{ uri: matchModal.photo_url }}
                  style={styles.modalImg}
                />
                <Text style={styles.modalName}>{matchModal.display_name}</Text>
                <Text style={styles.dim}>
                  Vi siete scelti a vicenda. Trovate un evento e ballate!
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }]}
                    onPress={() => {
                      setMatchModal(null);
                      router.push("/dancer/matches" as any);
                    }}
                  >
                    <Text style={styles.primaryText}>Vedi i match</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { flex: 1 }]}
                    onPress={() => setMatchModal(null)}
                  >
                    <Text style={styles.secondaryText}>Continua</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  card: {
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 0.78,
    backgroundColor: colors.bgSecondary,
  },
  cardImg: { width: "100%", height: "100%", position: "absolute" },
  grad: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  cardOverlay: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardName: { color: "#fff", fontSize: 26, fontWeight: "900" },
  cardAge: { color: "#fff", fontSize: 22, fontWeight: "700" },
  cardCity: { color: "#fff", fontSize: 14, marginTop: 4, opacity: 0.85 },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 10 },
  levelTag: {
    backgroundColor: colors.brand,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  levelTagText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  styleTag: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  styleTagText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  bioBox: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14, marginTop: 12,
  },
  bioLabel: { color: colors.brand, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  bioText: { color: colors.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    marginTop: 20,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  passBtn: { backgroundColor: "#374151" },
  likeBtn: { backgroundColor: colors.brand },
  endTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 12 },
  dim: { color: colors.textSecondary, textAlign: "center", marginTop: 6, fontSize: 13 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 13, paddingHorizontal: 20,
    borderRadius: radii.pill,
    marginTop: 18,
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 13, borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBg: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: 24, alignItems: "center",
    borderWidth: 2, borderColor: colors.brand,
    width: "100%", maxWidth: 400,
  },
  modalTitle: { color: colors.brand, fontSize: 22, fontWeight: "900", marginBottom: 14 },
  modalImg: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: colors.brand },
  modalName: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 14 },
});
