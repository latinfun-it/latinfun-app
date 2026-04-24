import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "./api";
import { colors, radii } from "./theme";

type Kind = "event" | "dj" | "school";
const PATHS: Record<Kind, string> = {
  event: "events",
  dj: "djs",
  school: "schools",
};
const LABELS: Record<Kind, { noun: string; fem: boolean; back: string }> = {
  event: { noun: "evento", fem: false, back: "/(tabs)/events" },
  dj: { noun: "profilo DJ", fem: false, back: "/(tabs)/djs" },
  school: { noun: "scuola", fem: true, back: "/(tabs)/schools" },
};

/** Cross-platform confirm: native Alert on mobile, window.confirm on web. */
function confirmAction(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      resolve(window.confirm(`${title}\n\n${message}`));
    } else {
      Alert.alert(title, message, [
        { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
        { text: "Elimina", style: "destructive", onPress: () => resolve(true) },
      ]);
    }
  });
}

export default function DeleteButton({
  kind,
  entityId,
  entityName,
  visible,
}: {
  kind: Kind;
  entityId: string;
  entityName?: string;
  visible: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const { noun, fem, back } = LABELS[kind];
  const art = fem ? "la" : "il";

  const onPress = async () => {
    const ok = await confirmAction(
      `Eliminare ${art} ${noun}?`,
      `Stai per eliminare${fem ? " la" : " il"} "${entityName || noun}". Questa azione non puo essere annullata.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.delete(`/${PATHS[kind]}/${entityId}`);
      if (Platform.OS === "web") {
        window.alert(`${fem ? "Scuola eliminata" : noun === "evento" ? "Evento eliminato" : "Profilo eliminato"}.`);
      } else {
        Alert.alert("Eliminato", `${noun} rimosso correttamente.`);
      }
      router.replace(back as any);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Errore durante l'eliminazione";
      if (Platform.OS === "web") window.alert(`Errore: ${msg}`);
      else Alert.alert("Errore", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      testID={`${kind}-delete-btn`}
      style={styles.btn}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
    >
      {busy ? (
        <ActivityIndicator color={colors.error} />
      ) : (
        <>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={styles.text}>Elimina {noun}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.pill,
    paddingVertical: 12,
    marginTop: 14,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  text: { color: colors.error, fontWeight: "800", fontSize: 13 },
});
