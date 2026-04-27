import React, { useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
const LABEL: Record<Kind, string> = {
  dj: "DJ",
  event: "evento",
  school: "scuola",
  playlist: "playlist",
};

/**
 * Pulsante cestino compatto per le card delle liste.
 * Visibile SOLO se l'utente loggato e' admin.
 * Mostra conferma prima della cancellazione.
 */
export default function AdminDeleteCorner({
  kind,
  entityId,
  entityName,
  onDeleted,
}: {
  kind: Kind;
  entityId: string;
  entityName?: string;
  onDeleted?: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  if (user?.role !== "admin") return null;

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/${ENDPOINT[kind]}/${entityId}`);
      onDeleted?.();
    } catch {
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        alert("Errore durante la cancellazione. Riprova.");
      } else {
        Alert.alert("Errore", "Errore durante la cancellazione. Riprova.");
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = (e: any) => {
    e.stopPropagation?.();
    if (busy) return;
    const label = LABEL[kind];
    const name = entityName ? `"${entityName}"` : `questo ${label}`;
    const msg = `Sei sicuro di voler eliminare ${name}?\nQuesta azione non si puo annullare.`;
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert(
        `Eliminare questo ${label}?`,
        msg,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      testID={`${kind}-admin-delete-${entityId}`}
      onPress={confirm}
      disabled={busy}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.btn}
    >
      <View style={styles.bg}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.error || "#ef4444"} />
        ) : (
          <Ionicons name="trash" size={18} color={colors.error || "#ef4444"} />
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
    borderColor: "rgba(239,68,68,0.55)",
  },
});
