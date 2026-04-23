import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, formatApiError } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/auth";
import type { Playlist } from "../../src/types";

const GENRES = ["bachata", "reggaeton", "salsa", "latin"];
const DEFAULT_COVER = "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg";

function spotifyEmbedFromUrl(input: string): { embed: string; external: string } | null {
  const m = input.match(/playlist\/([A-Za-z0-9]+)/);
  if (!m) return null;
  const id = m[1];
  return {
    embed: `https://open.spotify.com/embed/playlist/${id}`,
    external: `https://open.spotify.com/playlist/${id}`,
  };
}

export default function AdminPlaylists() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Playlist | "new" | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<Playlist[]>("/playlists");
    setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = (p: Playlist) => {
    Alert.alert(
      "Eliminare la playlist?",
      `"${p.title}" verra rimossa per tutti gli utenti.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/playlists/${p.id}`);
              await load();
            } catch (e: any) {
              Alert.alert("Errore", formatApiError(e?.response?.data?.detail) || e.message);
            }
          },
        },
      ]
    );
  };

  if (user && user.role !== "admin") {
    return (
      <View style={styles.notAdmin}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="admin-back-1">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Ionicons name="lock-closed" size={40} color={colors.textMuted} />
          <Text style={styles.notAdminTitle}>Area admin</Text>
          <Text style={styles.notAdminSub}>Solo gli amministratori possono curare le playlist.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="admin-playlists">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="admin-back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>ADMIN</Text>
            <Text style={styles.title}>Editor playlist</Text>
          </View>
          <TouchableOpacity
            testID="new-playlist-btn"
            style={styles.addBtn}
            onPress={() => setEditor("new")}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addText}>Nuova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: colors.textSecondary }}>Nessuna playlist. Aggiungi la prima.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`admin-row-${item.id}`}>
              <Image source={{ uri: item.cover_url }} style={styles.rowImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.genre.toUpperCase()} - pos {item.position} {item.featured ? "- FEAT" : ""}
                </Text>
              </View>
              <TouchableOpacity
                testID={`edit-${item.id}`}
                onPress={() => setEditor(item)}
                style={styles.iconBtn}
              >
                <Ionicons name="create" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                testID={`delete-${item.id}`}
                onPress={() => onDelete(item)}
                style={[styles.iconBtn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: colors.error }]}
              >
                <Ionicons name="trash" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal visible={editor !== null} animationType="slide" onRequestClose={() => setEditor(null)}>
        {editor !== null ? (
          <Editor
            initial={editor === "new" ? null : editor}
            onClose={() => setEditor(null)}
            onSaved={async () => {
              setEditor(null);
              await load();
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function Editor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Playlist | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [spotifyUrl, setSpotifyUrl] = useState(initial?.external_url || "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url || "");
  const [genre, setGenre] = useState(initial?.genre || "latin");
  const [position, setPosition] = useState(String(initial?.position ?? 10));
  const [featured, setFeatured] = useState(!!initial?.featured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 2 || description.trim().length < 3) {
      setError("Titolo (min 2) e descrizione (min 3) obbligatori");
      return;
    }
    const parsed = spotifyEmbedFromUrl(spotifyUrl.trim());
    if (!parsed) {
      setError("URL Spotify non valido. Usa il formato open.spotify.com/playlist/xxxxx");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim() || DEFAULT_COVER,
        platform: "spotify",
        embed_url: parsed.embed,
        external_url: parsed.external,
        genre,
        position: parseInt(position || "0", 10) || 0,
        featured,
      };
      if (initial) {
        await api.put(`/playlists/${initial.id}`, payload);
      } else {
        await api.post("/playlists", payload);
      }
      onSaved();
    } catch (e: any) {
      setError(formatApiError(e?.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} testID="editor-close">
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{initial ? "MODIFICA" : "NUOVA"}</Text>
            <Text style={styles.title}>{initial ? "Modifica playlist" : "Nuova playlist"}</Text>
          </View>
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Label text="Titolo *" />
          <TextInput
            testID="editor-title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Es. LatinHub Official 2026"
            placeholderTextColor={colors.textMuted}
          />

          <Label text="Descrizione *" />
          <TextInput
            testID="editor-desc"
            style={[styles.input, { height: 90, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Cosa aspettarsi, atmosfere, artisti..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Label text="URL Spotify *" />
          <TextInput
            testID="editor-spotify"
            style={styles.input}
            value={spotifyUrl}
            onChangeText={setSpotifyUrl}
            placeholder="https://open.spotify.com/playlist/..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Incolla il link di condivisione Spotify. L&apos;embed viene generato automaticamente.
          </Text>

          <Label text="Immagine di copertina (URL)" />
          <TextInput
            testID="editor-cover"
            style={styles.input}
            value={coverUrl}
            onChangeText={setCoverUrl}
            placeholder="https://... (opzionale)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <Label text="Genere *" />
          <View style={styles.chipRow}>
            {GENRES.map((g) => {
              const active = genre === g;
              return (
                <TouchableOpacity
                  key={g}
                  testID={`editor-genre-${g}`}
                  onPress={() => setGenre(g)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Label text="Posizione (ordine)" />
          <TextInput
            testID="editor-position"
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            testID="editor-featured"
            onPress={() => setFeatured((f) => !f)}
            style={[styles.toggle, featured && styles.toggleActive]}
          >
            <Ionicons
              name={featured ? "star" : "star-outline"}
              size={18}
              color={featured ? colors.gold : colors.textSecondary}
            />
            <Text style={[styles.toggleText, featured && { color: "#fff" }]}>
              {featured ? "In evidenza (Pick del Curatore)" : "Aggiungi agli in evidenza"}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error} testID="editor-error">{error}</Text> : null}

          <TouchableOpacity
            testID="editor-submit"
            style={styles.submitBtn}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitText}>
                  {initial ? "Salva modifiche" : "Pubblica playlist"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  notAdmin: { flex: 1, backgroundColor: colors.bg },
  notAdminTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 16 },
  notAdminSub: { color: colors.textSecondary, marginTop: 6, textAlign: "center" },
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  addText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#222" },
  rowTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  rowMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
  },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
  },
  chipTextActive: { color: "#fff" },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  toggleActive: { borderColor: colors.gold, backgroundColor: "rgba(245,158,11,0.08)" },
  toggleText: { color: colors.textSecondary, fontWeight: "700" },
  error: { color: colors.error, marginTop: 14, fontSize: 13 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginTop: 22,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
