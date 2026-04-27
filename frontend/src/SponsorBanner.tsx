import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
 * - Multi-banner: se ce ne sono piu' di uno, scroll orizzontale
 */
export default function SponsorBanner({
  position = "home_top",
}: {
  position?: "home_top" | "home_middle" | "home_bottom";
}) {
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

  const onClick = async (s: Sponsor) => {
    api.post(`/sponsors/${s.id}/click`).catch(() => {});
    if (s.link_url) {
      try {
        await Linking.openURL(s.link_url);
      } catch {
        /* silent */
      }
    }
  };

  if (sponsors.length === 0) return null;

  if (sponsors.length === 1) {
    const s = sponsors[0];
    return (
      <TouchableOpacity
        testID={`sponsor-${s.id}`}
        activeOpacity={0.9}
        onPress={() => onClick(s)}
        style={styles.single}
      >
        <Image source={{ uri: s.image_url }} style={styles.singleImg} />
        <View style={styles.overlay}>
          <View style={styles.adTag}>
            <Text style={styles.adTagText}>SPONSOR</Text>
          </View>
          {s.brand ? <Text style={styles.brand}>{s.brand}</Text> : null}
          <Text style={styles.title}>{s.title}</Text>
          {s.subtitle ? <Text style={styles.sub}>{s.subtitle}</Text> : null}
          {s.link_url ? (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{s.cta_label || "Scopri"}</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
    >
      {sponsors.map((s) => (
        <TouchableOpacity
          key={s.id}
          testID={`sponsor-${s.id}`}
          activeOpacity={0.9}
          onPress={() => onClick(s)}
          style={styles.multi}
        >
          <Image source={{ uri: s.image_url }} style={styles.singleImg} />
          <View style={styles.overlay}>
            <View style={styles.adTag}>
              <Text style={styles.adTagText}>SPONSOR</Text>
            </View>
            {s.brand ? <Text style={styles.brand}>{s.brand}</Text> : null}
            <Text style={styles.title} numberOfLines={1}>{s.title}</Text>
            {s.subtitle ? (
              <Text style={styles.sub} numberOfLines={1}>{s.subtitle}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  single: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radii.md,
    overflow: "hidden",
    height: 120,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multi: {
    width: 320,
    height: 120,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  singleImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
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
