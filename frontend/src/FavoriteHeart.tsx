import React, { useEffect, useState } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors } from "./theme";

type Kind = "dj" | "event" | "school" | "playlist";

const ENDPOINT: Record<Kind, string> = {
  dj: "djs",
  event: "events",
  school: "schools",
  playlist: "playlists",
};
const ACTION: Record<Kind, string> = {
  dj: "follow",
  event: "like",
  school: "save",
  playlist: "save",
};
const LIST_URL: Record<Kind, string> = {
  dj: "/my/follows",
  event: "/my/likes",
  school: "/my/saved-schools",
  playlist: "/my/saved-playlists",
};

/**
 * Cuoricino compatto (solo icona) per le card delle liste.
 * Cliccando salva/rimuove l'elemento dai preferiti dell'utente.
 * Se non loggato, redirect alla pagina di login.
 */
export default function FavoriteHeart({
  kind,
  entityId,
  size = 20,
}: {
  kind: Kind;
  entityId: string;
  size?: number;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setActive(false);
      return;
    }
    api
      .get<string[]>(LIST_URL[kind])
      .then((r) => setActive(r.data.includes(entityId)))
      .catch(() => {});
  }, [user, entityId, kind]);

  const toggle = async (e: any) => {
    e.stopPropagation?.();
    if (busy) return;
    if (!user) {
      router.push("/(auth)/login" as any);
      return;
    }
    const next = !active;
    setActive(next);
    setBusy(true);
    try {
      const path = `/${ENDPOINT[kind]}/${entityId}/${ACTION[kind]}`;
      if (next) await api.post(path);
      else await api.delete(path);
    } catch {
      setActive(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      testID={`${kind}-heart-${entityId}`}
      onPress={toggle}
      disabled={busy}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.btn}
    >
      <View style={styles.bg}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : (
          <Ionicons
            name={active ? "heart" : "heart-outline"}
            size={size}
            color={active ? colors.brand : "#fff"}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
  bg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
});
