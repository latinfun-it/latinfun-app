import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import BrandHeader from "../../src/BrandHeader";

type Sponsor = {
  id: string;
  title: string;
  subtitle?: string | null;
  brand?: string | null;
  image_url: string;
  link_url?: string | null;
  cta_label?: string | null;
  description?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tickets_url?: string | null;
  signup_url?: string | null;
  event_id?: string | null;
};

export default function SponsorDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Sponsor>(`/sponsors/${id}`);
      setSponsor(r.data);
    } catch {
      setSponsor(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Track view
    if (id) api.post(`/sponsors/${id}/view`).catch(() => {});
  }, [id, load]);

  const trackAndOpen = async (url: string | null | undefined, scheme?: string) => {
    if (!url) return;
    api.post(`/sponsors/${id}/click`).catch(() => {});
    let finalUrl = url;
    if (scheme === "tel") finalUrl = `tel:${url.replace(/\s/g, "")}`;
    else if (scheme === "mailto") finalUrl = `mailto:${url}`;
    else if (scheme === "whatsapp") {
      const clean = url.replace(/[^0-9+]/g, "");
      finalUrl = `https://wa.me/${clean.replace(/^\+/, "")}`;
    } else if (scheme === "maps") {
      finalUrl = Platform.select({
        ios: `http://maps.apple.com/?q=${encodeURIComponent(url)}`,
        android: `geo:0,0?q=${encodeURIComponent(url)}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(url)}`,
      });
    } else if (scheme && (scheme === "http" || scheme === "https")) {
      if (!/^https?:\/\//i.test(url)) finalUrl = `https://${url}`;
    } else {
      if (!/^https?:\/\//i.test(url) && !/:\/\//.test(url)) finalUrl = `https://${url}`;
    }
    try {
      const can = await Linking.canOpenURL(finalUrl!);
      if (!can) throw new Error("Cannot open");
      await Linking.openURL(finalUrl!);
    } catch {
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        window.open(finalUrl!, "_blank");
      } else {
        Alert.alert("Impossibile aprire", "Il link non è valido o l'app richiesta non è installata.");
      }
    }
  };

  const onShare = async () => {
    if (!sponsor) return;
    try {
      const msg = `${sponsor.brand ? sponsor.brand + " — " : ""}${sponsor.title}${
        sponsor.link_url ? "\n" + sponsor.link_url : ""
      }`;
      await Share.share({ message: msg });
    } catch {}
  };

  if (loading) {
    return (
      <View style={[ss.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!sponsor) {
    return (
      <View style={ss.container}>
        <BrandHeader />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={ss.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={ss.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={ss.empty}>
            <Ionicons name="alert-circle-outline" size={42} color={colors.textMuted} />
            <Text style={ss.emptyTitle}>Sponsor non disponibile</Text>
            <Text style={ss.dim}>Lo sponsor potrebbe essere stato rimosso o non è più attivo.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const ctas: Array<{
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    onPress: () => void;
    primary?: boolean;
  }> = [];

  // Primary CTA: tickets > signup > event > website
  if (sponsor.tickets_url) {
    ctas.push({
      key: "tickets",
      label: "Acquista biglietti",
      icon: "ticket",
      color: "#fff",
      bg: colors.brand,
      primary: true,
      onPress: () => trackAndOpen(sponsor.tickets_url, "https"),
    });
  }
  if (sponsor.signup_url) {
    ctas.push({
      key: "signup",
      label: "Iscriviti / Prenota",
      icon: "create",
      color: "#fff",
      bg: "#0ea5e9",
      primary: true,
      onPress: () => trackAndOpen(sponsor.signup_url, "https"),
    });
  }
  if (sponsor.event_id) {
    ctas.push({
      key: "event",
      label: "Vai all'evento",
      icon: "calendar",
      color: "#fff",
      bg: "#a855f7",
      primary: true,
      onPress: () => {
        api.post(`/sponsors/${id}/click`).catch(() => {});
        router.push(`/event/${sponsor.event_id}` as any);
      },
    });
  }
  if (sponsor.link_url) {
    ctas.push({
      key: "site",
      label: "Visita il sito",
      icon: "globe",
      color: "#fff",
      bg: "#1f2937",
      onPress: () => trackAndOpen(sponsor.link_url, "https"),
    });
  }
  if (sponsor.instagram_url) {
    ctas.push({
      key: "ig",
      label: "Instagram",
      icon: "logo-instagram",
      color: "#fff",
      bg: "#E1306C",
      onPress: () => trackAndOpen(sponsor.instagram_url, "https"),
    });
  }
  if (sponsor.facebook_url) {
    ctas.push({
      key: "fb",
      label: "Facebook",
      icon: "logo-facebook",
      color: "#fff",
      bg: "#1877F2",
      onPress: () => trackAndOpen(sponsor.facebook_url, "https"),
    });
  }
  if (sponsor.tiktok_url) {
    ctas.push({
      key: "tt",
      label: "TikTok",
      icon: "logo-tiktok",
      color: "#fff",
      bg: "#000",
      onPress: () => trackAndOpen(sponsor.tiktok_url, "https"),
    });
  }
  if (sponsor.whatsapp) {
    ctas.push({
      key: "wa",
      label: "WhatsApp",
      icon: "logo-whatsapp",
      color: "#fff",
      bg: "#25D366",
      onPress: () => trackAndOpen(sponsor.whatsapp, "whatsapp"),
    });
  }
  if (sponsor.phone) {
    ctas.push({
      key: "tel",
      label: "Chiama",
      icon: "call",
      color: "#fff",
      bg: "#10b981",
      onPress: () => trackAndOpen(sponsor.phone, "tel"),
    });
  }
  if (sponsor.email) {
    ctas.push({
      key: "mail",
      label: "Invia email",
      icon: "mail",
      color: "#fff",
      bg: "#475569",
      onPress: () => trackAndOpen(sponsor.email, "mailto"),
    });
  }
  if (sponsor.address) {
    ctas.push({
      key: "map",
      label: "Vedi sulla mappa",
      icon: "location",
      color: "#fff",
      bg: "#0891b2",
      onPress: () => trackAndOpen(sponsor.address, "maps"),
    });
  }

  return (
    <View style={ss.container}>
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={ss.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onShare} style={ss.iconBtn}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {/* Hero */}
          <View style={ss.hero}>
            <Image source={{ uri: sponsor.image_url }} style={ss.heroImg} />
            <View style={ss.heroOverlay}>
              <View style={ss.adTag}>
                <Text style={ss.adTagText}>SPONSOR</Text>
              </View>
              {sponsor.brand ? (
                <Text style={ss.brand}>{sponsor.brand.toUpperCase()}</Text>
              ) : null}
              <Text style={ss.title}>{sponsor.title}</Text>
              {sponsor.subtitle ? (
                <Text style={ss.subtitle}>{sponsor.subtitle}</Text>
              ) : null}
            </View>
          </View>

          {/* Description */}
          {sponsor.description ? (
            <View style={ss.section}>
              <Text style={ss.sectionTitle}>Informazioni</Text>
              <Text style={ss.descText}>{sponsor.description}</Text>
            </View>
          ) : null}

          {/* Address text */}
          {sponsor.address ? (
            <View style={ss.section}>
              <View style={ss.iconRow}>
                <Ionicons name="location" size={18} color={colors.brand} />
                <Text style={ss.addrText}>{sponsor.address}</Text>
              </View>
            </View>
          ) : null}

          {/* CTAs */}
          {ctas.length > 0 ? (
            <View style={ss.ctaSection}>
              {ctas.map((c, idx) => (
                <TouchableOpacity
                  key={c.key}
                  testID={`cta-${c.key}`}
                  activeOpacity={0.85}
                  onPress={c.onPress}
                  style={[
                    ss.ctaBtn,
                    { backgroundColor: c.bg },
                    c.primary && ss.ctaPrimary,
                    idx === 0 && c.primary && { marginTop: 0 },
                  ]}
                >
                  <Ionicons name={c.icon} size={20} color={c.color} />
                  <Text style={[ss.ctaText, { color: c.color }]}>{c.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={c.color} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={ss.section}>
              <Text style={ss.dim}>Nessun contatto disponibile per questo sponsor.</Text>
            </View>
          )}

          <View style={ss.disclaimerBox}>
            <Ionicons name="megaphone-outline" size={14} color={colors.textMuted} />
            <Text style={ss.disclaimer}>
              Contenuto promozionale. LatinFun non è responsabile dei prodotti o servizi offerti dallo sponsor.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    height: 240,
    margin: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.bgSecondary,
  },
  heroImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: {
    flex: 1,
    padding: 18,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  adTag: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  adTagText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  brand: { color: colors.brand, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, marginBottom: 4 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", lineHeight: 28 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 6 },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  descText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  addrText: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: 10,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    gap: 12,
  },
  ctaPrimary: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  ctaText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  dim: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
