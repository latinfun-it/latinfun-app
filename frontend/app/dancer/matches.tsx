import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import BrandHeader from "../../src/BrandHeader";

type Match = {
  match_at: string;
  profile: {
    user_id: string;
    display_name: string;
    photo_url: string;
    city: string;
    age?: number;
    styles: string[];
    level: string;
    instagram?: string;
  };
};

export default function DancerMatches() {
  const router = useRouter();
  const [list, setList] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Match[]>("/dancer/matches");
      setList(r.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="dancer-matches">
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>I TUOI MATCH</Text>
            <Text style={styles.title}>Match {list.length ? `(${list.length})` : ""}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 50 }} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nessun match ancora</Text>
            <Text style={styles.dim}>
              Vai su "Match Partner" e metti like ad altri ballerini per
              iniziare a fare match.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/dancer" as any)}
            >
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.primaryText}>Esplora ballerini</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
            {list.map((m) => (
              <TouchableOpacity
                key={m.profile.user_id}
                testID={`match-${m.profile.user_id}`}
                style={styles.row}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/dancer/chat/[peerId]",
                    params: {
                      peerId: m.profile.user_id,
                      peerName: m.profile.display_name,
                      peerPhoto: m.profile.photo_url,
                    },
                  } as any)
                }
              >
                <Image source={{ uri: m.profile.photo_url }} style={styles.avatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>
                    {m.profile.display_name}
                    {m.profile.age ? <Text style={styles.dim}>, {m.profile.age}</Text> : null}
                  </Text>
                  <Text style={styles.dim}>📍 {m.profile.city} · {m.profile.level}</Text>
                  <View style={styles.tagsRow}>
                    {(m.profile.styles || []).slice(0, 3).map((s) => (
                      <View key={s} style={styles.tag}>
                        <Text style={styles.tagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.actionsCol}>
                  <View style={styles.chatBtn}>
                    <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  </View>
                  {m.profile.instagram ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`https://instagram.com/${m.profile.instagram!.replace("@", "")}`);
                      }}
                      style={styles.igBtn}
                    >
                      <Ionicons name="logo-instagram" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 10 },
  dim: { color: colors.textSecondary, fontSize: 13, textAlign: "center" },
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12, marginBottom: 10,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#222" },
  name: { color: "#fff", fontWeight: "800", fontSize: 16 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: {
    backgroundColor: "rgba(236,72,153,0.14)",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: { color: colors.brand, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  igBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#E4405F",
    alignItems: "center", justifyContent: "center",
  },
  actionsCol: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  chatBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: radii.pill,
    marginTop: 14,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
