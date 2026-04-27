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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/auth";
import BoostButton from "../../src/BoostButton";
import DeleteButton from "../../src/DeleteButton";
import ReviewsSection from "../../src/ReviewsSection";
import type { School } from "../../src/types";

export default function SchoolDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<School>(`/schools/${id}`);
        setSchool(r.data);
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
  if (!school) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Scuola non trovata</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="school-detail">
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={styles.hero}>
          <Image
            source={{ uri: school.cover_url || school.image_url }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={["rgba(5,5,5,0.25)", "rgba(5,5,5,0.7)", "#050505"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <TouchableOpacity
              testID="school-back"
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.city}>{school.city.toUpperCase()}</Text>
            <Text style={styles.name}>{school.name}</Text>
            {school.verified_by_mauro ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                <Text style={styles.verifiedText}>VERIFIED BY MAURO</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat value={String(school.students)} label="Studenti" />
          <Stat value={String(school.styles.length)} label="Stili" />
          <Stat value={String(school.levels.length)} label="Livelli" />
        </View>

        <View style={styles.body}>
          <Text style={styles.bio}>{school.bio}</Text>

          <BoostButton
            kind="school"
            entityId={school.id}
            boosted={school.boosted}
            canBoost={
              !!user && !school.boosted && (school.owner_id === user.id || user.role === "admin")
            }
          />

          <View style={styles.chipRow}>
            {school.styles.map((s) => (
              <View key={s} style={styles.chip}>
                <Ionicons name="musical-notes" size={11} color={colors.brand} />
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>

          {school.levels.length ? (
            <View style={styles.levelBox}>
              <Text style={styles.sectionTitle}>Livelli disponibili</Text>
              <View style={styles.chipRow}>
                {school.levels.map((l) => (
                  <View key={l} style={[styles.chip, { borderColor: colors.gold }]}>
                    <Text style={[styles.chipText, { color: "#fff" }]}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.contactBox}>
            <Text style={styles.sectionTitle}>Contatti</Text>
            <ContactRow
              icon="location"
              label={school.address}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/${encodeURIComponent(
                    school.address + ", " + school.city
                  )}`
                )
              }
            />
            {school.phone ? (
              <ContactRow
                icon="call"
                label={school.phone}
                onPress={() => Linking.openURL(`tel:${school.phone}`)}
              />
            ) : null}
            {school.email ? (
              <ContactRow
                icon="mail"
                label={school.email}
                onPress={() => Linking.openURL(`mailto:${school.email}`)}
              />
            ) : null}
            {school.website ? (
              <ContactRow
                icon="globe"
                label={school.website.replace(/^https?:\/\//, "")}
                onPress={() => Linking.openURL(school.website!)}
              />
            ) : null}
            {school.instagram ? (
              <ContactRow
                icon="logo-instagram"
                label="Instagram"
                onPress={() => Linking.openURL(school.instagram!)}
              />
            ) : null}
          </View>

          <DeleteButton
            kind="school"
            entityId={school.id}
            entityName={school.name}
            visible={user?.role === "admin"}
          />

          <ReviewsSection kind="school" targetId={school.id} />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contactRow} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <Text style={styles.contactLabel} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 360, overflow: "hidden", backgroundColor: "#111" },
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
  city: { color: colors.gold, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  name: { color: "#fff", fontSize: 32, fontWeight: "900", letterSpacing: -0.8, marginTop: 6 },
  verifiedBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  verifiedText: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: "center",
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  body: { padding: spacing.lg, gap: spacing.lg },
  bio: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  levelBox: { gap: 10 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  contactBox: { gap: 10 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactLabel: { color: "#fff", flex: 1, fontWeight: "600" },
});
