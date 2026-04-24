import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "../src/api";
import { colors, radii, spacing } from "../src/theme";

const RADII = [25, 50, 100, 200];

type Status = {
  enabled: boolean;
  radius_km: number;
  has_token: boolean;
  has_location: boolean;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api.get<Status>("/users/notifications");
      setStatus(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const projectId =
    (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId;

  const registerForPush = async (): Promise<string | null> => {
    if (Platform.OS === "web") return null;
    if (!Device.isDevice) {
      Alert.alert(
        "Serve un dispositivo reale",
        "Le notifiche push non funzionano su simulatore web. Prova su iPhone/Android con Expo Go."
      );
      return null;
    }
    const { status: cur } = await Notifications.getPermissionsAsync();
    let finalStatus = cur;
    if (finalStatus !== "granted") {
      const { status: ask } = await Notifications.requestPermissionsAsync();
      finalStatus = ask;
    }
    if (finalStatus !== "granted") {
      Alert.alert("Permesso negato", "Attiva le notifiche dalle impostazioni del sistema.");
      return null;
    }
    try {
      const t = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      return t.data;
    } catch (e: any) {
      Alert.alert("Errore", e?.message || "Impossibile ottenere il token push");
      return null;
    }
  };

  const sendLocation = async () => {
    if (Platform.OS === "web") return false;
    const { status: cur } = await Location.requestForegroundPermissionsAsync();
    if (cur !== "granted") {
      Alert.alert(
        "Posizione negata",
        "Senza la tua posizione non possiamo avvisarti degli eventi vicini."
      );
      return false;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await api.post("/users/location", {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    return true;
  };

  const onToggle = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) {
        if (Platform.OS === "web") {
          Alert.alert(
            "Solo su mobile",
            "Le notifiche push sono disponibili nell'app mobile (Expo Go / build native)."
          );
          setBusy(false);
          return;
        }
        const token = await registerForPush();
        if (!token) {
          setBusy(false);
          return;
        }
        await api.post("/users/push-token", { token });
        await sendLocation();
      }
      const r = await api.post("/users/notifications", {
        enabled: value,
        radius_km: status?.radius_km || 50,
      });
      setStatus((s) => ({
        enabled: r.data.notifications_enabled,
        radius_km: r.data.notifications_radius_km,
        has_token: value && !!s?.has_token ? true : value,
        has_location: value ? true : s?.has_location || false,
      } as Status));
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onChangeRadius = async (km: number) => {
    if (!status) return;
    setBusy(true);
    try {
      const r = await api.post("/users/notifications", {
        enabled: status.enabled,
        radius_km: km,
      });
      setStatus({ ...status, radius_km: r.data.notifications_radius_km });
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onRefreshLocation = async () => {
    setBusy(true);
    try {
      const ok = await sendLocation();
      if (ok) {
        setStatus((s) => (s ? { ...s, has_location: true } : s));
        Alert.alert("Posizione aggiornata", "Ora riceverai eventi calibrati sulla tua zona.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onTestPush = async () => {
    setBusy(true);
    try {
      await api.post("/notifications/test", {
        title: "LatinHub",
        body: "Notifica di test - tutto OK!",
      });
      Alert.alert("Inviata", "Controlla la barra notifiche tra pochi secondi.");
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="notif-screen">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="notif-back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>SMART</Text>
            <Text style={styles.title}>Notifiche eventi</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Avvisami degli eventi vicini</Text>
            <Text style={styles.cardDesc}>
              Ricevi una notifica push ogni volta che organizzatori pubblicano serate nel tuo raggio.
              Niente spam, solo musica vera.
            </Text>
          </View>
          <Switch
            testID="notif-switch"
            value={!!status?.enabled}
            onValueChange={onToggle}
            disabled={busy}
            trackColor={{ false: "#333", true: colors.brand }}
            thumbColor="#fff"
          />
        </View>

        {Platform.OS === "web" ? (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Ionicons name="information-circle" size={20} color={colors.gold} />
            <Text style={[styles.cardDesc, { marginLeft: 10, flex: 1 }]}>
              Le notifiche push funzionano solo dentro l&apos;app mobile (Expo Go o build nativa).
              Da browser puoi comunque gestire le preferenze.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Raggio di ricerca</Text>
        <View style={styles.chipRow}>
          {RADII.map((km) => {
            const active = status?.radius_km === km;
            return (
              <TouchableOpacity
                key={km}
                testID={`radius-${km}`}
                onPress={() => onChangeRadius(km)}
                style={[styles.chip, active && styles.chipActive]}
                disabled={busy}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{km} km</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Stato</Text>
        <Row
          icon={status?.has_token ? "checkmark-circle" : "close-circle"}
          color={status?.has_token ? "#10B981" : colors.textMuted}
          label={status?.has_token ? "Token push registrato" : "Nessun token push"}
        />
        <Row
          icon={status?.has_location ? "checkmark-circle" : "close-circle"}
          color={status?.has_location ? "#10B981" : colors.textMuted}
          label={status?.has_location ? "Posizione registrata" : "Posizione non registrata"}
        />

        {status?.enabled ? (
          <View style={{ gap: 10, marginTop: 18 }}>
            <TouchableOpacity
              testID="refresh-location"
              style={styles.ghostBtn}
              onPress={onRefreshLocation}
              disabled={busy}
            >
              <Ionicons name="locate" size={18} color={colors.brand} />
              <Text style={styles.ghostText}>Aggiorna posizione</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="test-push"
              style={styles.primaryBtn}
              onPress={onTestPush}
              disabled={busy || !status.has_token}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={styles.primaryText}>Invia notifica di test</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
      </ScrollView>
    </View>
  );
}

function Row({ icon, color, label }: { icon: any; color: string; label: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cardDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  sectionLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontWeight: "800", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowLabel: { color: "#fff", fontSize: 13 },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  ghostText: { color: colors.brand, fontWeight: "800" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
