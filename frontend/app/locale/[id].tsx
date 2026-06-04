import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";
import { useI18n } from "../../src/i18n";
import FavoriteHeart from "../../src/FavoriteHeart";
import BoostButton from "../../src/BoostButton";
import type { Locale } from "../../src/types";

export default function LocaleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [locale, setLocale] = useState<Locale | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.get<Locale>(`/locali/${id}`);
      setLocale(r.data);
    } catch {
      setLocale(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.fill, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!locale) {
    return (
      <View style={[styles.fill, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={{ color: "#fff", fontSize: 18 }}>{lang === "es" ? "Local no encontrado" : "Locale non trovato"}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.cta, { marginTop: 20 }]}>
          <Text style={styles.ctaText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canEdit = user && (user.role === "admin" || locale.owner_id === user.id);
  const canBoost = !!canEdit;
  const cover = locale.cover_url || locale.image_url;

  const callPhone = () => {
    if (locale.phone) Linking.openURL(`tel:${locale.phone}`);
  };
  const openSite = () => {
    if (locale.website) Linking.openURL(locale.website.startsWith("http") ? locale.website : `https://${locale.website}`);
  };
  const openInstagram = () => {
    if (locale.instagram) {
      const handle = locale.instagram.replace("@", "").replace("https://instagram.com/", "");
      Linking.openURL(`https://instagram.com/${handle}`);
    }
  };
  const openFacebook = () => {
    if (locale.facebook) Linking.openURL(locale.facebook.startsWith("http") ? locale.facebook : `https://facebook.com/${locale.facebook}`);
  };
  const openDirections = () => {
    const q = encodeURIComponent(`${locale.address}, ${locale.city}`);
    const url = Platform.OS === "ios" ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url);
  };
  const openMail = () => {
    if (locale.email) Linking.openURL(`mailto:${locale.email}`);
  };

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.coverWrap}>
          <Image source={{ uri: cover }} style={styles.cover} />
          <LinearGradient
            colors={["rgba(5,5,5,0.4)", "transparent", "rgba(5,5,5,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={styles.coverActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="locale-back">
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <FavoriteHeart kind={"locale" as any} entityId={locale.id} size={20} />
            </View>
          </SafeAreaView>

          <View style={styles.coverInfo}>
            {locale.boosted ? (
              <View style={styles.boostBadge}>
                <Ionicons name="rocket" size={12} color="#fff" />
                <Text style={styles.boostText}>BOOST</Text>
              </View>
            ) : null}
            <Text style={styles.city}>{locale.city.toUpperCase()} · {(locale.cuisine || "").toUpperCase()}</Text>
            <Text style={styles.name} numberOfLines={2}>{locale.name}</Text>
            <Text style={styles.subline}>
              {locale.category.replace("_", " ").toUpperCase()}{locale.price_range ? ` · ${locale.price_range}` : ""}
            </Text>
            {locale.avg_rating ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.rating}>
                  {locale.avg_rating.toFixed(1)} ({locale.reviews_count || 0})
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          {locale.phone ? (
            <TouchableOpacity style={styles.actionBtn} onPress={callPhone} testID="locale-call">
              <Ionicons name="call" size={20} color={colors.brand} />
              <Text style={styles.actionLabel}>{t("locali.detail.callPhone")}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.actionBtn} onPress={openDirections} testID="locale-directions">
            <Ionicons name="navigate" size={20} color={colors.brand} />
            <Text style={styles.actionLabel}>{t("locali.detail.directions")}</Text>
          </TouchableOpacity>
          {locale.website ? (
            <TouchableOpacity style={styles.actionBtn} onPress={openSite} testID="locale-site">
              <Ionicons name="globe" size={20} color={colors.brand} />
              <Text style={styles.actionLabel}>{t("locali.detail.website")}</Text>
            </TouchableOpacity>
          ) : null}
          {locale.email ? (
            <TouchableOpacity style={styles.actionBtn} onPress={openMail} testID="locale-mail">
              <Ionicons name="mail" size={20} color={colors.brand} />
              <Text style={styles.actionLabel}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === "es" ? "Sobre el local" : "Sul locale"}</Text>
          <Text style={styles.bio}>{locale.bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === "es" ? "Información" : "Informazioni"}</Text>
          <InfoRow icon="location" label={lang === "es" ? "Dirección" : "Indirizzo"} value={`${locale.address}, ${locale.city}`} />
          {locale.hours ? <InfoRow icon="time" label={t("locali.fields.hours")} value={locale.hours} /> : null}
          {locale.phone ? <InfoRow icon="call" label="Telefono" value={locale.phone} /> : null}
          {locale.instagram ? (
            <TouchableOpacity onPress={openInstagram} activeOpacity={0.7}>
              <InfoRow icon="logo-instagram" label="Instagram" value={locale.instagram} />
            </TouchableOpacity>
          ) : null}
          {locale.facebook ? (
            <TouchableOpacity onPress={openFacebook} activeOpacity={0.7}>
              <InfoRow icon="logo-facebook" label="Facebook" value={locale.facebook} />
            </TouchableOpacity>
          ) : null}
        </View>

        {(locale.gallery || []).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("locali.fields.gallery")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
              {locale.gallery!.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.galleryImg} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {canBoost ? (
          <View style={[styles.section, { paddingBottom: 30 }]}>
            <BoostButton
              kind={"locale" as any}
              entityId={locale.id}
              boosted={locale.boosted}
              canBoost={canBoost}
            />
          </View>
        ) : null}

        {canEdit ? (
          <TouchableOpacity
            testID="locale-edit-btn"
            onPress={() => router.push(`/admin/locali?edit=${locale.id}` as any)}
            style={[styles.cta, { marginHorizontal: 20, marginTop: 10 }]}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={styles.ctaText}>{t("locali.edit")}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  coverWrap: { height: 360, width: "100%", overflow: "hidden" },
  cover: { width: "100%", height: "100%" },
  coverActions: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  coverInfo: { position: "absolute", bottom: 16, left: 20, right: 20 },
  boostBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.brand, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, marginBottom: 8 },
  boostText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  city: { color: colors.gold, fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  name: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 4, letterSpacing: -0.8 },
  subline: { color: "#ddd", fontSize: 12, marginTop: 4, fontWeight: "700" },
  rating: { color: colors.gold, fontSize: 12, fontWeight: "800" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: "wrap",
    gap: 12,
  },
  actionBtn: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    minWidth: 70,
  },
  actionLabel: { color: "#fff", fontSize: 11, fontWeight: "700" },
  section: { paddingHorizontal: 20, paddingTop: 22 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 10 },
  bio: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  infoRow: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "center" },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  infoValue: { color: "#fff", fontSize: 14, marginTop: 2 },
  galleryImg: { width: 140, height: 100, borderRadius: 12, backgroundColor: "#111" },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
