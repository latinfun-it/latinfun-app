import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/auth";
import { useI18n } from "../../src/i18n";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import type { DJ, EventItem, School } from "../../src/types";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
  const [myDj, setMyDj] = useState<DJ | null>(null);
  const [mySchool, setMySchool] = useState<School | null>(null);
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const loadMine = useCallback(async () => {
    if (!user) return;
    try {
      const [djR, scR, evR] = await Promise.all([
        api.get("/my/dj").catch(() => ({ data: null })),
        api.get("/my/school").catch(() => ({ data: null })),
        api.get<EventItem[]>("/events").catch(() => ({ data: [] as EventItem[] })),
      ]);
      setMyDj(djR.data);
      setMySchool(scR.data);
      setMyEvents((evR.data || []).filter((e: EventItem) => e.owner_id === user.id));
      // unread contact messages count (only for admin)
      if (user.role === "admin") {
        try {
          const u = await api.get<{ unread: number }>("/admin/contact/unread-count");
          setUnreadMsgs(u.data.unread || 0);
        } catch {
          /* silent */
        }
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);
  useFocusEffect(
    useCallback(() => {
      loadMine();
    }, [loadMine])
  );

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="profile-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={styles.headerWrap}>
          <Image
            source={{ uri: "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg" }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={["rgba(5,5,5,0.3)", "rgba(5,5,5,0.85)", "#050505"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <View style={styles.headerContent}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {user?.role === "admin" ? (
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.gold} />
                  <Text style={styles.roleText}>ADMIN LATINFUN</Text>
                </View>
              ) : (
                <View style={[styles.roleBadge, { borderColor: colors.brand }]}>
                  <Ionicons name="heart" size={12} color={colors.brand} />
                  <Text style={[styles.roleText, { color: colors.brand }]}>LATINFUN MEMBER</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <Stat label="Eventi" value="0" />
            <Stat label="DJ seguiti" value="0" />
            <Stat label="Mix salvati" value="0" />
          </View>

          {user?.role === "admin" ? (
            <>
              <MenuItem
                icon="people-outline"
                label="Utenti registrati (admin)"
                hint="Elenco, export CSV, notifiche broadcast"
                onPress={() => router.push("/admin/users")}
              />
              <MenuItem
                icon="ribbon-outline"
                label="Organizzatori (admin)"
                hint="Verifica ⭐, revoca DJ/Scuole/Promoter/Locali"
                onPress={() => router.push("/admin/organizers" as any)}
              />
              <MenuItem
                icon="musical-notes-outline"
                label="Gestisci playlist (admin)"
                hint="Aggiungi, modifica, rimuovi le playlist curate"
                onPress={() => router.push("/admin/playlists")}
              />
              <MenuItem
                icon="megaphone-outline"
                label="Sponsor banner (admin)"
                hint="Gestisci banner pubblicitari sulla home"
                onPress={() => router.push("/admin/sponsors" as any)}
              />
              <MenuItem
                icon="restaurant-outline"
                label="Gestione Locali (admin)"
                hint="Aggiungi, modifica, rimuovi locali Latin"
                onPress={() => router.push("/admin/locali" as any)}
              />
              <MenuItem
                icon="mail-outline"
                label="Messaggi ricevuti (admin)"
                hint="Casella contatti dagli utenti"
                onPress={() => router.push("/admin/messages" as any)}
                rightBadge={unreadMsgs > 0 ? String(unreadMsgs) : undefined}
                badgeTone="brand"
              />
              <MenuItem
                icon="cash-outline"
                label="Pagamenti Affiliati (admin)"
                hint="Commissioni 10% da pagare ai referrer"
                onPress={() => router.push("/admin/referrals" as any)}
              />
              <MenuItem
                icon="receipt-outline"
                label="Fatture in Cloud (admin)"
                hint="Connessione OAuth + ricevute automatiche BOOST"
                onPress={() => router.push("/admin/fic" as any)}
              />
            </>
          ) : null}

          <Text style={styles.sectionLabel}>{t("profile.yourPresence")}</Text>

          <MenuItem
            icon="megaphone-outline"
            label={t("profile.createEvent")}
            hint={t("profile.createEventHint")}
            onPress={() => router.push("/event/create")}
          />

          {myDj ? (
            <MenuItem
              icon="disc-outline"
              label={lang === "es" ? "Tu perfil DJ" : "Il tuo profilo DJ"}
              hint={myDj.boosted ? (lang === "es" ? "YA PROMOCIONADO" : "GIA PROMOSSO - badge BOOST attivo") : (lang === "es" ? "Promociónalo con BOOST" : "Apri per promuoverlo con BOOST")}
              rightBadge={myDj.boosted ? "BOOST" : (lang === "es" ? "PROMOCIONAR" : "PROMUOVI")}
              badgeTone={myDj.boosted ? "gold" : "brand"}
              onPress={() => router.push(`/dj/${myDj.id}`)}
            />
          ) : (
            <MenuItem
              icon="disc-outline"
              label={t("profile.registerDj")}
              hint={t("profile.registerDjHint")}
              onPress={() => router.push("/dj/register")}
            />
          )}

          {mySchool ? (
            <>
              <MenuItem
                icon="dance-ballroom"
                iconSet="mci"
                label={lang === "es" ? "Tu escuela de baile" : "La tua scuola di ballo"}
                hint={
                  mySchool.boosted ? (lang === "es" ? "YA PROMOCIONADA" : "GIA PROMOSSA - badge BOOST attivo") : (lang === "es" ? "Promociónala con BOOST" : "Apri per promuoverla con BOOST")
                }
                rightBadge={mySchool.boosted ? "BOOST" : (lang === "es" ? "PROMOCIONAR" : "PROMUOVI")}
                badgeTone={mySchool.boosted ? "gold" : "brand"}
                onPress={() => router.push(`/school/${mySchool.id}`)}
              />
              <MenuItem
                icon="paper-plane-outline"
                label={lang === "es" ? "Leads recibidos" : "Lead ricevuti"}
                hint={lang === "es" ? "Estudiantes interesados en contactarte" : "Studenti interessati a contattarti"}
                onPress={() => router.push("/school/leads" as any)}
              />
            </>
          ) : (
            <MenuItem
              icon="dance-ballroom"
              iconSet="mci"
              label={t("profile.registerSchool")}
              hint={t("profile.registerSchoolHint")}
              onPress={() => router.push("/school/register")}
            />
          )}

          {myEvents.length > 0 ? (
            <View style={styles.myEventsBox}>
              <Text style={styles.myEventsTitle}>I TUOI EVENTI ({myEvents.length})</Text>
              {myEvents.slice(0, 4).map((e) => (
                <TouchableOpacity
                  key={e.id}
                  testID={`my-event-${e.id}`}
                  style={styles.myEventRow}
                  onPress={() => router.push(`/event/${e.id}`)}
                >
                  <Ionicons
                    name={e.boosted ? "rocket" : "calendar-outline"}
                    size={16}
                    color={e.boosted ? colors.gold : colors.textSecondary}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.myEventTitle} numberOfLines={1}>
                      {e.title}
                    </Text>
                    <Text style={styles.myEventMeta} numberOfLines={1}>
                      {new Date(e.date).toLocaleDateString("it-IT")} - {e.city}
                    </Text>
                  </View>
                  {e.boosted ? (
                    <View style={[styles.pill, { backgroundColor: colors.gold }]}>
                      <Text style={[styles.pillText, { color: "#050505" }]}>BOOST</Text>
                    </View>
                  ) : (
                    <View style={[styles.pill, { backgroundColor: colors.brand }]}>
                      <Text style={styles.pillText}>PROMUOVI</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>{t("profile.preferences")}</Text>

          <MenuItem
            icon="heart-outline"
            label={t("profile.favorites")}
            hint={t("profile.favoritesHint")}
            onPress={() => router.push("/favorites")}
          />
          <MenuItem
            icon="download-outline"
            label={t("profile.logoKit")}
            hint={t("profile.logoKitHint")}
            onPress={() => router.push("/logo-kit")}
          />
          <MenuItem
            icon="notifications-outline"
            label={t("profile.notifications")}
            hint={t("profile.notificationsHint")}
            onPress={() => router.push("/notifications")}
          />
          <MenuItem
            icon="musical-notes-outline"
            label={t("profile.myPlaylists")}
            hint={t("profile.myPlaylistsHint")}
          />
          <MenuItem
            icon="help-circle-outline"
            label={t("profile.support")}
            hint={t("profile.supportHint")}
            onPress={() => router.push("/contact")}
          />
          <MenuItem
            icon="gift-outline"
            label={t("profile.affiliate")}
            hint={t("profile.affiliateHint")}
            onPress={() => router.push("/affiliate" as any)}
          />
          <MenuItem
            icon="briefcase-outline"
            label={lang === "es" ? "Conviértete en Organizador" : "Diventa Organizzatore"}
            hint={lang === "es" ? "Crea eventos, DJs, escuelas de baile" : "Crea eventi, DJ, scuole di ballo"}
            onPress={() => router.push("/become-organizer" as any)}
          />
          <MenuItem
            icon="globe-outline"
            label={t("profile.language")}
            hint="Italiano · Español"
            onPress={() => router.push("/settings/language" as any)}
          />
          <MenuItem
            icon="lock-closed-outline"
            label={lang === "es" ? "Cambiar contraseña" : "Cambia password"}
            hint={lang === "es" ? "Actualiza tu contraseña" : "Aggiorna la tua password"}
            onPress={() => router.push("/account/change-password" as any)}
          />
          <MenuItem
            icon="flag-outline"
            label={lang === "es" ? "País" : "Paese"}
            hint={lang === "es" ? "Muestra eventos de tu país" : "Mostra eventi del tuo paese"}
            onPress={() => router.push("/settings/country" as any)}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label={t("profile.privacy")}
            hint={t("profile.privacyHint")}
            onPress={() => router.push("/legal/privacy" as any)}
          />
          <MenuItem
            icon="document-text-outline"
            label={t("profile.terms")}
            hint={t("profile.termsHint")}
            onPress={() => router.push("/legal/terms" as any)}
          />

          <Text style={styles.sectionLabel}>
            {lang === "es" ? "Cuenta" : "Account"}
          </Text>

          <TouchableOpacity
            testID="delete-account-menu"
            style={styles.deleteAccountBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/account/delete" as any)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.deleteAccountLabel}>
                {lang === "es" ? "Eliminar cuenta" : "Elimina account"}
              </Text>
              <Text style={styles.deleteAccountHint}>
                {lang === "es"
                  ? "Borra permanentemente tu cuenta y todos tus datos"
                  : "Cancella definitivamente account e dati"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.brand} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="logout-btn"
            style={styles.logout}
            activeOpacity={0.85}
            onPress={onLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.brand} />
            <Text style={styles.logoutText}>{t("auth.logout")}</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>{t("profile.footer")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  iconSet = "ionicons",
  label,
  hint,
  onPress,
  rightBadge,
  badgeTone,
}: {
  icon: any;
  iconSet?: "ionicons" | "mci";
  label: string;
  hint?: string;
  onPress?: () => void;
  rightBadge?: string;
  badgeTone?: "gold" | "brand";
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.8}
      testID={`menu-${label}`}
      onPress={onPress}
    >
      {iconSet === "mci" ? (
        <MaterialCommunityIcons name={icon} size={22} color={colors.textSecondary} />
      ) : (
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
      )}
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
      </View>
      {rightBadge ? (
        <View
          style={[
            styles.pill,
            { backgroundColor: badgeTone === "gold" ? colors.gold : colors.brand },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              badgeTone === "gold" ? { color: "#050505" } : null,
            ]}
          >
            {rightBadge}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerWrap: { height: 360, overflow: "hidden" },
  headerContent: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 22 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.bg,
  },
  avatarText: { color: "#fff", fontSize: 38, fontWeight: "900" },
  name: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 12 },
  email: { color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginTop: 12,
  },
  roleText: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  body: { padding: spacing.lg },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.lg,
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
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  menuLabel: { color: "#fff", fontWeight: "700" },
  menuHint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  myEventsBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  myEventsTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  myEventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  myEventTitle: { color: "#fff", fontWeight: "700", fontSize: 13 },
  myEventMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginTop: spacing.md,
  },
  logoutText: { color: colors.brand, fontWeight: "800" },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 41, 71, 0.08)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(229, 41, 71, 0.35)",
    padding: 16,
    marginBottom: 10,
  },
  deleteAccountLabel: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 14,
  },
  deleteAccountHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  footer: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl, fontSize: 12 },
});
