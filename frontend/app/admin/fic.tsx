import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import BrandHeader from "../../src/BrandHeader";

type FicStatus = {
  connected: boolean;
  configured: boolean;
  company_id?: string;
  expires_at?: string;
};

type EmittedDoc = {
  stripe_payment_id?: string;
  document_type?: string;
  document_number?: string;
  amount_gross?: number;
  customer_email?: string;
  created_at?: string;
  ok?: boolean;
  error?: string;
};

export default function FicAdminScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<FicStatus | null>(null);
  const [docs, setDocs] = useState<EmittedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.get<FicStatus>("/integrations/fic/status");
      setStatus(s.data);
      if (s.data?.connected) {
        try {
          const d = await api.get<EmittedDoc[]>("/admin/fic/emitted");
          setDocs(d.data || []);
        } catch {}
      }
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || "Impossibile caricare lo stato");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAuthorize = async () => {
    if (authorizing) return;
    setAuthorizing(true);
    try {
      const r = await api.get<{ authorize_url: string }>("/integrations/fic/authorize");
      if (r.data?.authorize_url) {
        await Linking.openURL(r.data.authorize_url);
        Alert.alert(
          "Autorizzazione aperta",
          "Completa l'autorizzazione su Fatture in Cloud, poi torna qui e premi 'Aggiorna'.",
        );
      }
    } catch (e: any) {
      Alert.alert("Errore", e?.response?.data?.detail || "Impossibile avviare l'autorizzazione");
    } finally {
      setAuthorizing(false);
    }
  };

  const onDisconnect = () => {
    Alert.alert(
      "Disconnetti Fatture in Cloud",
      "Sicuro? Le fatture future NON saranno più emesse automaticamente.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Disconnetti",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/integrations/fic/disconnect");
              await load();
            } catch (e: any) {
              Alert.alert("Errore", e?.response?.data?.detail || "Errore disconnessione");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[ss.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={ss.container}>
      <BrandHeader />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={ss.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={ss.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={ss.title}>Fatture in Cloud</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
        >
          {/* Status card */}
          <View
            style={[
              ss.card,
              status?.connected ? ss.cardOk : ss.cardWarn,
            ]}
          >
            <View style={ss.statusRow}>
              <Ionicons
                name={status?.connected ? "checkmark-circle" : "alert-circle"}
                size={32}
                color={status?.connected ? "#22c55e" : "#fbbf24"}
              />
              <View style={{ flex: 1 }}>
                <Text style={ss.statusTitle}>
                  {status?.connected
                    ? "Connesso ✓"
                    : status?.configured
                      ? "Non autorizzato"
                      : "Non configurato"}
                </Text>
                <Text style={ss.statusSub}>
                  {status?.connected
                    ? `Azienda ID: ${status.company_id || "n/a"}`
                    : status?.configured
                      ? "Client ID e Secret caricati. Manca l'autorizzazione OAuth."
                      : "Devi caricare FIC_CLIENT_ID e FIC_CLIENT_SECRET nei Secrets di Emergent."}
                </Text>
              </View>
            </View>

            {status?.connected ? (
              <TouchableOpacity style={ss.dangerBtn} onPress={onDisconnect}>
                <Ionicons name="unlink" size={16} color="#fff" />
                <Text style={ss.dangerBtnText}>Disconnetti</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[ss.primaryBtn, !status?.configured && { opacity: 0.5 }]}
                onPress={onAuthorize}
                disabled={!status?.configured || authorizing}
              >
                {authorizing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="open-outline" size={18} color="#fff" />
                    <Text style={ss.primaryBtnText}>
                      Autorizza Fatture in Cloud
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Info section */}
          <Text style={ss.sectionTitle}>📋 Come funziona</Text>
          <View style={ss.infoCard}>
            <Text style={ss.infoText}>
              Ogni pagamento BOOST su Stripe genera automaticamente un documento fiscale
              su Fatture in Cloud:
            </Text>
            <View style={ss.bulletRow}>
              <Text style={ss.bullet}>🧾</Text>
              <Text style={ss.bulletText}>
                <Text style={{ fontWeight: "800", color: "#fff" }}>Cliente con P.IVA</Text> → Fattura elettronica (SdI)
              </Text>
            </View>
            <View style={ss.bulletRow}>
              <Text style={ss.bullet}>🧾</Text>
              <Text style={ss.bulletText}>
                <Text style={{ fontWeight: "800", color: "#fff" }}>Cliente privato</Text> → Ricevuta/Corrispettivo
              </Text>
            </View>
          </View>

          {/* Emitted documents */}
          {status?.connected && (
            <>
              <Text style={ss.sectionTitle}>📑 Documenti emessi ({docs.length})</Text>
              {docs.length === 0 ? (
                <View style={ss.emptyCard}>
                  <Text style={ss.emptyText}>
                    Nessun documento ancora emesso. Apparirà qui dopo il primo pagamento BOOST.
                  </Text>
                </View>
              ) : (
                docs.map((d, i) => (
                  <View key={i} style={ss.docCard}>
                    <View style={ss.docHeader}>
                      <View
                        style={[
                          ss.docTypeBadge,
                          d.document_type === "invoice" ? ss.badgeBlue : ss.badgePink,
                        ]}
                      >
                        <Text style={ss.docTypeText}>
                          {d.document_type === "invoice" ? "FATTURA" : "RICEVUTA"}
                        </Text>
                      </View>
                      <Text style={ss.docNumber}>#{d.document_number || "—"}</Text>
                      <Text style={ss.docAmount}>€{(d.amount_gross || 0).toFixed(2)}</Text>
                    </View>
                    <Text style={ss.docCust}>{d.customer_email || "n/a"}</Text>
                    <Text style={ss.docDate}>
                      {d.created_at ? new Date(d.created_at).toLocaleString("it-IT") : ""}
                    </Text>
                    {!d.ok && d.error ? (
                      <Text style={ss.docError}>⚠️ {d.error}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </>
          )}
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
  title: { color: "#fff", fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center" },
  card: {
    backgroundColor: colors.bgSecondary,
    padding: 20,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  cardOk: { borderColor: "rgba(34,197,94,0.4)", backgroundColor: "rgba(34,197,94,0.06)" },
  cardWarn: { borderColor: "rgba(251,191,36,0.4)", backgroundColor: "rgba(251,191,36,0.06)" },
  statusRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  statusTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statusSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.md,
    marginTop: 16,
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: 16,
    gap: 8,
  },
  dangerBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 6,
  },
  infoCard: {
    padding: 16,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  infoText: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  bulletRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  bullet: { fontSize: 14 },
  bulletText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
  emptyCard: {
    padding: 24,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  docCard: {
    padding: 14,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  docTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeBlue: { backgroundColor: "#1d4ed8" },
  badgePink: { backgroundColor: colors.brand },
  docTypeText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  docNumber: { color: "#fff", fontSize: 13, fontWeight: "700", flex: 1 },
  docAmount: { color: colors.brand, fontSize: 14, fontWeight: "800" },
  docCust: { color: colors.textSecondary, fontSize: 12 },
  docDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  docError: { color: "#dc2626", fontSize: 11, marginTop: 6, fontStyle: "italic" },
});
