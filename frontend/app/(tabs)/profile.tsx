import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

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
                  <Text style={styles.roleText}>ADMIN - MAURO CATALINI</Text>
                </View>
              ) : (
                <View style={[styles.roleBadge, { borderColor: colors.brand }]}>
                  <Ionicons name="heart" size={12} color={colors.brand} />
                  <Text style={[styles.roleText, { color: colors.brand }]}>LATINHUB MEMBER</Text>
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
            <MenuItem
              icon="musical-notes-outline"
              label="Gestisci playlist (admin)"
              hint="Aggiungi, modifica, rimuovi le playlist curate"
              onPress={() => router.push("/admin/playlists")}
            />
          ) : null}
          <MenuItem
            icon="school-outline"
            label="Registra la tua scuola"
            hint="Aumenta visibilita tra gli studenti latini"
            onPress={() => router.push("/school/register")}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifiche smart"
            hint="Eventi vicino a te"
          />
          <MenuItem
            icon="musical-notes-outline"
            label="Le mie playlist Spotify / Tidal"
            hint="Presto disponibile"
          />
          <MenuItem
            icon="calendar-outline"
            label="Cronologia eventi"
          />
          <MenuItem
            icon="help-circle-outline"
            label="Supporto & contatti"
          />

          <TouchableOpacity
            testID="logout-btn"
            style={styles.logout}
            activeOpacity={0.85}
            onPress={onLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.brand} />
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>LatinHub v1.0 - Made in Italia con ritmo</Text>
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
  label,
  hint,
  onPress,
}: {
  icon: any;
  label: string;
  hint?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.8}
      testID={`menu-${label}`}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
  footer: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl, fontSize: 12 },
});
