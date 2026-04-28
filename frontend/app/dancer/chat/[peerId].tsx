import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Image,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/api";
import { useAuth } from "../../../src/auth";
import { colors, radii, spacing } from "../../../src/theme";

type ChatMsg = {
  id: string;
  pair_id: string;
  sender_id: string;
  text: string;
  read: boolean;
  created_at: string;
};

type Peer = {
  user_id: string;
  display_name: string;
  city?: string;
  photos?: string[];
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatScreen() {
  const { peerId, peerName, peerPhoto } = useLocalSearchParams<{
    peerId: string;
    peerName?: string;
    peerPhoto?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peer, setPeer] = useState<Peer | null>(
    peerName ? { user_id: peerId!, display_name: peerName, photos: peerPhoto ? [peerPhoto] : [] } : null
  );
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const loadMessages = useCallback(async () => {
    if (!peerId) return;
    try {
      const r = await api.get<ChatMsg[]>(`/dancer/chat/${peerId}`);
      setMessages(r.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [peerId]);

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 5000); // simple polling
    return () => clearInterval(t);
  }, [loadMessages]);

  // try to load peer info if not supplied
  useEffect(() => {
    if (peer || !peerId) return;
    (async () => {
      try {
        const r = await api.get<{ profile: Peer }[]>("/dancer/matches");
        const found = r.data.find((m) => m.profile?.user_id === peerId);
        if (found) setPeer(found.profile);
      } catch {
        /* silent */
      }
    })();
  }, [peer, peerId]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending || !peerId) return;
    setSending(true);
    // optimistic
    const tempMsg: ChatMsg = {
      id: `tmp-${Date.now()}`,
      pair_id: "",
      sender_id: user!.id,
      text: t,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText("");
    Keyboard.dismiss();
    try {
      const r = await api.post<ChatMsg>(`/dancer/chat/${peerId}`, { text: t });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? r.data : m))
      );
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setText(t);
    } finally {
      setSending(false);
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
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="chat-screen">
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.peerInfo}>
          {peer?.photos?.[0] ? (
            <Image source={{ uri: peer.photos[0] }} style={styles.peerAvatar} />
          ) : (
            <View style={[styles.peerAvatar, styles.peerAvatarPh]}>
              <Ionicons name="person" size={20} color={colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.peerName} numberOfLines={1}>
              {peer?.display_name || "Match"}
            </Text>
            {peer?.city ? (
              <Text style={styles.peerCity} numberOfLines={1}>
                {peer.city}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.lg,
            gap: 6,
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Scrivi il primo messaggio!</Text>
              <Text style={styles.emptyHint}>
                Salutare per primi rompe il ghiaccio 💃
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_id === user?.id;
            const prev = messages[index - 1];
            const showHeader =
              !prev || prev.sender_id !== item.sender_id ||
              new Date(item.created_at).getTime() -
                new Date(prev.created_at).getTime() >
                300000;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
                    ]}
                  >
                    {fmtTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            testID="chat-send"
            onPress={send}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              (!text.trim() || sending) && { opacity: 0.5 },
            ]}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  peerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.sm,
    flex: 1,
  },
  peerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#222" },
  peerAvatarPh: { alignItems: "center", justifyContent: "center" },
  peerName: { color: "#fff", fontWeight: "800", fontSize: 15 },
  peerCity: { color: colors.textSecondary, fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyHint: { color: colors.textMuted, fontSize: 12 },
  bubbleRow: { width: "100%" },
  bubbleRowMine: { alignItems: "flex-end" },
  bubbleRowTheirs: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: colors.brand,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.bgSecondary,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: "#fff" },
  bubbleTime: { fontSize: 9, marginTop: 3, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)" },
  bubbleTimeTheirs: { color: colors.textMuted },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 10 : spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    color: "#fff",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 110,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
