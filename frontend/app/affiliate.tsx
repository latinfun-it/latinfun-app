import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { api } from "../src/api";
import { colors, radii, spacing } from "../src/theme";

type Tier = {
  key: "bronze" | "silver" | "gold";
  label: string;
  first_pct: number;
  recurring_pct: number;
};

type ReferralData = {
  referral_code: string | null;
  share_url?: string;
  deep_link?: string;
  tier?: Tier;
  next_tier?: {
    key: string;
    label: string;
    first_pct: number;
    referrals_needed: number;
    min_active_referrals: number;
  } | null;
  launch_boost?: {
    active: boolean;
    percent: number;
    until: string | null;
  };
  stats: {
    invited: number;
    paying: number;
    earned_pending: number;
    earned_paid: number;
    earned_total?: number;
  };
  invited: Array<{ id: string; name: string; email: string; created_at: string }>;
  commissions: Array<{
    id: string;
    referee_id: string;
    referee_name: string;
    source_kind: string;
    source_amount: number;
    commission_amount: number;
    applied_percent?: number;
    tier_at_credit?: string;
    is_first_payment?: boolean;
    launch_boost_active?: boolean;
    status: "pending" | "paid_out";
    created_at: string;
  }>;
};

const TIER_VISUAL: Record<string, { color: string; emoji: string; gradient: [string, string] }> = {
  bronze: { color: "#cd7f32", emoji: "🥉", gradient: ["#7c3a0e", "#cd7f32"] },
  silver: { color: "#c0c0c0", emoji: "🥈", gradient: ["#525252", "#c0c0c0"] },
  gold:   { color: "#facc15", emoji: "🥇", gradient: ["#b45309", "#facc15"] },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AffiliateScreen() {
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<ReferralData>("/my/referrals");
      setData(r.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const code = data?.referral_code || "";
  const inviteLink = data?.share_url || `https://latinfun.it/r/${code}`;
  const tier = data?.tier;
  const nextTier = data?.next_tier;
  const launchBoost = data?.launch_boost;
  const activeReferrals = data?.stats.paying || 0;
  const minNext = nextTier?.min_active_referrals || 0;
  const progressPct = nextTier ? Math.min(100, (activeReferrals / minNext) * 100) : 100;
  const effectiveFirstPct = launchBoost?.active
    ? Math.max(launchBoost.percent, tier?.first_pct || 0)
    : (tier?.first_pct || 0.10);
  const tierVis = tier ? TIER_VISUAL[tier.key] : TIER_VISUAL.bronze;
  const shareText = `🔥 Ti regalo l'accesso pro a LatinFun! Usa il mio codice ${code} per ${Math.round(effectiveFirstPct*100)}% di bonus al primo BOOST.\n\n${inviteLink}`;

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  };

  const share = async () => {
    if (Platform.OS === "web") {
      try {
        if ((navigator as any).share) {
          await (navigator as any).share({
            title: "LatinFun",
            text: shareText,
            url: inviteLink,
          });
        } else {
          await Clipboard.setStringAsync(shareText);
          // eslint-disable-next-line no-alert
          window.alert("Link copiato! Incollalo dove vuoi condividerlo.");
        }
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await Share.share({ message: shareText, url: inviteLink });
    } catch {
      /* silent */
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!data || !code) {
    return (
      <View style={s.center}>
        <Text style={{ color: colors.textMuted }}>Devi essere loggato.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="affiliate-screen">
      <SafeAreaView edges={["top"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Programma Affiliati</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* HERO */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="gift" size={32} color="#fff" />
          </View>
          <Text style={s.heroTitle}>Guadagna fino al {Math.round(effectiveFirstPct*100)}%</Text>
          <Text style={s.heroSub}>
            Per ogni nuovo iscritto che porti, ricevi una commissione sul suo primo pagamento, più il 5% ricorrente sui BOOST successivi.
          </Text>
        </View>

        {/* LAUNCH BOOST BANNER */}
        {launchBoost?.active ? (
          <View style={s.launchBanner} testID="launch-boost-banner">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="rocket" size={20} color="#fff" />
              <Text style={s.launchTitle}>🚀 LAUNCH BOOST ATTIVO</Text>
            </View>
            <Text style={s.launchSub}>
              Fino al {launchBoost.until ? new Date(launchBoost.until).toLocaleDateString("it-IT", { day: "2-digit", month: "long" }) : "—"}
              {" "}ottieni il <Text style={{ fontWeight: "900", color: "#facc15" }}>{Math.round(launchBoost.percent*100)}%</Text> sul primo pagamento di ogni invitato (anziché il tuo tier base)
            </Text>
          </View>
        ) : null}

        {/* TIER CARD */}
        {tier ? (
          <View style={[s.tierCard, { borderColor: tierVis.color }]} testID="tier-card">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={s.tierLabel}>IL TUO LIVELLO</Text>
                <Text style={[s.tierName, { color: tierVis.color }]}>
                  {tierVis.emoji} {tier.label.toUpperCase()}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.tierPct}>{Math.round(tier.first_pct*100)}%</Text>
                <Text style={s.tierPctLbl}>primo pagamento</Text>
              </View>
            </View>

            {nextTier ? (
              <View style={{ marginTop: 14 }}>
                <Text style={s.tierProgressText}>
                  {nextTier.referrals_needed} {nextTier.referrals_needed === 1 ? "invitato pagante" : "invitati paganti"} al prossimo livello: <Text style={{ fontWeight: "900", color: "#fff" }}>{nextTier.label} ({Math.round(nextTier.first_pct*100)}%)</Text>
                </Text>
                <View style={s.progressTrack}>
                  <View
                    style={[s.progressFill, { width: `${progressPct}%`, backgroundColor: tierVis.color }]}
                  />
                </View>
                <Text style={s.tierProgressMeta}>
                  {activeReferrals} / {nextTier.min_active_referrals}
                </Text>
              </View>
            ) : (
              <Text style={[s.tierProgressText, { marginTop: 12 }]}>
                🏆 Hai raggiunto il livello massimo! Continui a ricevere il {Math.round(tier.first_pct*100)}% primo pagamento + {Math.round(tier.recurring_pct*100)}% sui BOOST ricorrenti.
              </Text>
            )}
          </View>
        ) : null}

        {/* Code Box */}
        <View style={s.codeBox}>
          <Text style={s.codeLabel}>IL TUO CODICE</Text>
          <Text style={s.codeValue}>{code}</Text>
          <View style={s.codeBtns}>
            <TouchableOpacity onPress={copyCode} style={[s.btn, { flex: 1 }]} activeOpacity={0.85}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color="#fff" />
              <Text style={s.btnText}>{copied ? "Copiato" : "Copia"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={share} style={[s.btnPrimary, { flex: 1 }]} activeOpacity={0.85}>
              <Ionicons name="share-social" size={16} color="#fff" />
              <Text style={s.btnText}>Condividi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          <Stat label="Invitati" value={String(data.stats.invited)} icon="people" />
          <Stat label="Hanno pagato" value={String(data.stats.paying)} icon="cash-outline" />
          <Stat
            label="In attesa"
            value={`€${data.stats.earned_pending.toFixed(2)}`}
            icon="time"
            tone="gold"
          />
          <Stat
            label="Ricevuti"
            value={`€${data.stats.earned_paid.toFixed(2)}`}
            icon="checkmark-circle"
            tone="green"
          />
        </View>

        {/* Come funziona */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Come funziona</Text>
          <Step n="1" title="Condividi il tuo link" desc="Mandalo agli organizzatori, DJ, scuole o ai locali via WhatsApp, Instagram o email." />
          <Step n="2" title="L'invitato si registra" desc="Cliccando sul tuo link, il codice viene compilato automaticamente." />
          <Step n="3" title="Primo BOOST = jackpot" desc={`Al primo pagamento dell'invitato guadagni il ${Math.round(effectiveFirstPct*100)}%${launchBoost?.active ? " (Launch Boost attivo!)" : ""}.`} />
          <Step n="4" title="Commissione ricorrente 5%" desc="Su tutti i BOOST successivi continui a guadagnare il 5% per sempre." />
          <Step n="5" title="Sali di livello" desc="Bronze → Argento → Oro. Più referral attivi porti, più alta la tua %." />
          <Step n="6" title="Riscuoti" desc="L'admin LatinFun salda mensilmente i guadagni accumulati." />
        </View>

        {/* Commissioni */}
        {data.commissions.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Le tue commissioni</Text>
            {data.commissions.map((c) => (
              <View key={c.id} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{c.referee_name || "Utente"}</Text>
                  <Text style={s.rowMeta}>
                    {c.source_kind} · {fmtDate(c.created_at)}
                    {c.applied_percent ? ` · ${Math.round(c.applied_percent*100)}%` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {c.launch_boost_active ? (
                      <View style={[s.miniTag, { backgroundColor: "rgba(225,29,72,0.18)", borderColor: "#e11d48" }]}>
                        <Text style={[s.miniTagText, { color: "#fecaca" }]}>🚀 LANCIO</Text>
                      </View>
                    ) : c.is_first_payment ? (
                      <View style={[s.miniTag, { backgroundColor: "rgba(250,204,21,0.15)", borderColor: "#facc15" }]}>
                        <Text style={[s.miniTagText, { color: "#facc15" }]}>1° PAGAMENTO</Text>
                      </View>
                    ) : (
                      <View style={[s.miniTag, { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "#22c55e" }]}>
                        <Text style={[s.miniTagText, { color: "#86efac" }]}>↻ RICORRENTE</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.amount}>+€{c.commission_amount.toFixed(2)}</Text>
                  <View
                    style={[
                      s.statusBadge,
                      c.status === "paid_out" ? s.statusPaid : s.statusPending,
                    ]}
                  >
                    <Text
                      style={{
                        color: c.status === "paid_out" ? "#5BCC8A" : colors.gold,
                        fontSize: 9,
                        fontWeight: "900",
                      }}
                    >
                      {c.status === "paid_out" ? "PAGATO" : "IN ATTESA"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Invitati */}
        {data.invited.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>I tuoi invitati ({data.invited.length})</Text>
            {data.invited.map((u) => (
              <View key={u.id} style={s.row}>
                <View style={s.avatar}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.rowName}>{u.name}</Text>
                  <Text style={s.rowMeta}>
                    {u.email} · {fmtDate(u.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "gold" | "green";
}) {
  const color = tone === "gold" ? colors.gold : tone === "green" ? "#5BCC8A" : colors.brand;
  return (
    <View style={s.statBox}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <View style={s.stepRow}>
      <View style={s.stepN}>
        <Text style={s.stepNText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },

  hero: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },
  heroSub: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },

  // Launch Boost banner
  launchBanner: {
    backgroundColor: "#1f0a12",
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e11d48",
    marginBottom: spacing.lg,
  },
  launchTitle: { color: "#fff", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  launchSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 8, lineHeight: 17 },

  // Tier card
  tierCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  tierLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  tierName: { fontSize: 22, fontWeight: "900", marginTop: 4 },
  tierPct: { color: "#fff", fontSize: 28, fontWeight: "900" },
  tierPctLbl: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  tierProgressText: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  tierProgressMeta: { color: colors.textMuted, fontSize: 10, marginTop: 4, textAlign: "right" },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  // Mini tags on commissions
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  codeBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  codeLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 6,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    marginBottom: 14,
  },
  codeBtns: { flexDirection: "row", gap: 10, width: "100%" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.lg,
  },
  statBox: {
    width: "48%",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },

  section: { marginTop: spacing.lg },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 10 },

  stepRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.bgSecondary,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  stepN: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  stepTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  amount: { color: "#5BCC8A", fontSize: 15, fontWeight: "900" },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusPending: { borderColor: colors.gold, backgroundColor: colors.gold + "15" },
  statusPaid: { borderColor: "#5BCC8A", backgroundColor: "#5BCC8A15" },
});
