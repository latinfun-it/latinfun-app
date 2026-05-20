import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "./api";
import { colors, radii, spacing } from "./theme";

type Sponsor = {
  id: string;
  title: string;
  subtitle?: string;
  brand?: string;
  image_url: string;
  link_url?: string;
  cta_label?: string;
  position: string;
};

/**
 * Banner sponsor pubblicitario per la home.
 * - Carica i banner attivi nel range date e per la posizione richiesta
 * - Track impressions e clicks
 * - Multi-banner: VERTICAL stack (uno sotto l'altro, scroll col contenuto della pagina)
 * - Supporta numero ILLIMITATO di sponsor
 * - Click → naviga alla pagina dettaglio sponsor con tutte le CTA
 */
export default function SponsorBanner({
  position = "home_top",
}: {
  position?: "home_top" | "home_middle" | "home_bottom";
}) {
  const router = useRouter();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<Sponsor[]>(`/sponsors?position=${position}`)
      .then((r) => setSponsors(r.data || []))
      .catch(() => {});
  }, [position]);

  useEffect(() => {
    sponsors.forEach((s) => {
      if (!tracked.has(s.id)) {
        api.post(`/sponsors/${s.id}/view`).catch(() => {});
        setTracked((prev) => new Set(prev).add(s.id));
      }
    });
  }, [sponsors]);

  const onClick = (s: Sponsor) => {
    api.post(`/sponsors/${s.id}/click`).catch(() => {});
    router.push(`/sponsor/${s.id}` as any);
  };

  if (sponsors.length === 0) return null;

  // VERTICAL STACK: ogni sponsor full-width, uno sotto l'altro
  return (
    <View style={styles.stack}>
      {sponsors.map((s) => (
        <TouchableOpacity
          key={s.id}
          testID={`sponsor-${s.id}`}
          activeOpacity={0.9}
          onPress={() => onClick(s)}
          style={styles.banner}
        >
          <Image source={{ uri: s.image_url }} style={styles.bannerImg} />
          <View style={styles.overlay}>
            <View style={styles.adTag}>
              <Text style={styles.adTagText}>SPONSOR</Text>
            </View>
            {s.brand ? <Text style={styles.brand}>{s.brand}</Text> : null}
            <Text style={styles.title} numberOfLines={2}>{s.title}</Text>
            {s.subtitle ? (
              <Text style={styles.sub} numberOfLines={2}>{s.subtitle}</Text>
            ) : null}
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{s.cta_label || "Scopri"}</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 12,
  },
  banner: {
    borderRadius: radii.md,
    overflow: "hidden",
    height: 130,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5,5,5,0.45)",
  },
  adTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  adTagText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  brand: { color: colors.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#fff", fontSize: 17, fontWeight: "900", marginTop: 2 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ctaText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
