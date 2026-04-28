import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

type ContactMessage = {
  id: string;
  sender_id: string | null;
  sender_name: string;
  sender_email: string;
  category: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
};

const CATEGORY_META: Record<string, { label: string; color: string; icon: any }> = {
  bug: { label: "Bug", color: "#FF3154", icon: "bug" },
  suggerimento: { label: "Suggerimento", color: "#FFB400", icon: "bulb" },
  collaborazione: { label: "Collaborazione", color: "#3DB7FF", icon: "people" },
  sponsorship: { label: "Sponsorship", color: "#A06BFF", icon: "megaphone" },
  altro: { label: "Altro", color: "#888", icon: "chatbubbles" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMessagesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [opened, setOpened] = useState<ContactMessage | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<ContactMessage[]>("/admin/contact", {
        params: { only_unread: filter === "unread" },
      });
      setItems(r.data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        Alert.alert("Accesso negato", "Solo admin");
        router.back();
      }
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openMessage = async (m: ContactMessage) => {
    setOpened(m);
    if (!m.read) {
      try {
        await api.patch(`/admin/contact/${m.id}/read`);
        setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
      } catch {
        /* silent */
      }
    }
  };

  const replyEmail = (m: ContactMessage) => {
    const subject = encodeURIComponent(`Re: ${m.subject}`);
    const body = encodeURIComponent(
      `\n\n---\nIn risposta al tuo messaggio:\n"${m.message}"\n\nLatinFun`
    );
    Linking.openURL(`mailto:${m.sender_email}?subject=${subject}&body=${body}`);
  };

  const deleteMessage = (m: ContactMessage) => {
    const doDelete = async () => {
      try {
        await api.delete(`/admin/contact/${m.id}`);
        setItems((prev) => prev.filter((x) => x.id !== m.id));
        setOpened(null);
      } catch {
        if (Platform.OS === "web") {
          // eslint-disable-next-line no-alert
          window.alert("Errore: impossibile eliminare");
        } else {
          Alert.alert("Errore", "Impossibile eliminare");
        }
      }
    };

    const confirmText = `Elimina messaggio?\n\nDa ${m.sender_name} - "${m.subject}"\n\nOperazione non reversibile.`;

    if (Platform.OS === "web") {
      // window.confirm è bloccante e funziona su React Native Web
      // eslint-disable-next-line no-alert
      if (window.confirm(confirmText)) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      "Elimina messaggio?",
      `Da ${m.sender_name} - "${m.subject}". Operazione non reversibile.`,
      [
        { text: "Annulla", style: "cancel" },
        { text: "Elimina", style: "destructive", onPress: doDelete },
      ]
    );
  };

  const unreadCount = items.filter((m) => !m.read).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="admin-messages">
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Messaggi ricevuti</Text>
          <Text style={styles.headerSub}>
            {items.length} totali · {unreadCount} non letti
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        <FilterTab
          label="Tutti"
          active={filter === "all"}
          count={items.length}
          onPress={() => setFilter("all")}
        />
        <FilterTab
          label="Non letti"
          active={filter === "unread"}
          count={unreadCount}
          onPress={() => setFilter("unread")}
          highlight
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nessun messaggio</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = CATEGORY_META[item.category] || CATEGORY_META.altro;
          return (
            <TouchableOpacity
              testID={`msg-${item.id}`}
              onPress={() => openMessage(item)}
              activeOpacity={0.85}
              style={[styles.card, !item.read && styles.cardUnread]}
            >
              <View
                style={[
                  styles.catBadge,
                  { backgroundColor: meta.color + "22", borderColor: meta.color },
                ]}
              >
                <Ionicons name={meta.icon} size={11} color={meta.color} />
                <Text style={[styles.catBadgeText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
              <View style={styles.cardHead}>
                <Text style={styles.sender} numberOfLines={1}>
                  {item.sender_name}
                </Text>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.subject} numberOfLines={1}>
                {item.subject}
              </Text>
              <Text style={styles.preview} numberOfLines={2}>
                {item.message}
              </Text>
              <View style={styles.cardFoot}>
                <Text style={styles.time}>{fmtDate(item.created_at)}</Text>
                <Text style={styles.email} numberOfLines={1}>
                  {item.sender_email}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail modal */}
      <Modal
        visible={!!opened}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpened(null)}
      >
        {opened ? (
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <SafeAreaView edges={["top"]} style={styles.modalHead}>
              <TouchableOpacity onPress={() => setOpened(null)} style={styles.backBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Messaggio</Text>
              <TouchableOpacity
                onPress={() => deleteMessage(opened)}
                style={styles.delBtn}
                testID="delete-msg"
              >
                <Ionicons name="trash-outline" size={20} color="#FF3154" />
              </TouchableOpacity>
            </SafeAreaView>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
              <View
                style={[
                  styles.catBadge,
                  {
                    alignSelf: "flex-start",
                    backgroundColor:
                      (CATEGORY_META[opened.category]?.color || "#888") + "22",
                    borderColor: CATEGORY_META[opened.category]?.color || "#888",
                  },
                ]}
              >
                <Ionicons
                  name={CATEGORY_META[opened.category]?.icon || "chatbubbles"}
                  size={11}
                  color={CATEGORY_META[opened.category]?.color || "#888"}
                />
                <Text
                  style={[
                    styles.catBadgeText,
                    { color: CATEGORY_META[opened.category]?.color || "#888" },
                  ]}
                >
                  {CATEGORY_META[opened.category]?.label || "Altro"}
                </Text>
              </View>
              <Text style={styles.modalSubject}>{opened.subject}</Text>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Da</Text>
                <Text style={styles.metaValue}>{opened.sender_name}</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Email</Text>
                <Text style={styles.metaValue}>{opened.sender_email}</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Data</Text>
                <Text style={styles.metaValue}>{fmtDate(opened.created_at)}</Text>
              </View>
              <Text style={styles.metaLabel}>Messaggio</Text>
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{opened.message}</Text>
              </View>
              <TouchableOpacity
                testID="reply-email"
                onPress={() => replyEmail(opened)}
                style={styles.replyBtn}
                activeOpacity={0.9}
              >
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={styles.replyText}>Rispondi via email</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function FilterTab({
  label,
  active,
  count,
  onPress,
  highlight,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterTab, active && styles.filterTabActive]}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
      <View
        style={[
          styles.countBadge,
          {
            backgroundColor: active
              ? "#fff"
              : highlight && count > 0
              ? colors.brand
              : colors.bgTertiary,
          },
        ]}
      >
        <Text
          style={{
            color: active
              ? colors.brand
              : highlight && count > 0
              ? "#fff"
              : colors.textSecondary,
            fontSize: 11,
            fontWeight: "800",
          }}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  filterTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  filterTextActive: { color: "#fff" },
  countBadge: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: colors.brand },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sender: { color: "#fff", fontWeight: "800", fontSize: 14, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  subject: { color: "#fff", fontSize: 13, fontWeight: "600" },
  preview: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  cardFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  time: { color: colors.textMuted, fontSize: 10 },
  email: { color: colors.textMuted, fontSize: 10, flex: 1, textAlign: "right" },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  catBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  delBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,49,84,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubject: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 16,
  },
  metaBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    width: 80,
    textTransform: "uppercase",
  },
  metaValue: { color: "#fff", fontSize: 13, flex: 1 },
  messageBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    marginBottom: spacing.lg,
  },
  messageText: { color: "#fff", fontSize: 14, lineHeight: 22 },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  replyText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
