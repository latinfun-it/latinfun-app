import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors, radii } from "./theme";

type Kind = "dj" | "event";

const ENDPOINT: Record<Kind, string> = {
  dj: "djs",
  event: "events",
};

const ACTION: Record<Kind, string> = {
  dj: "follow",
  event: "like",
};

/**
 * Favorite toggle button:
 * - kind="dj" -> Segui / Seguito (icona persona)
 * - kind="event" -> Mi piace / Salvato (icona cuore)
 * Requires auth; redirects to login if not logged.
 */
export default function FavoriteButton({
  kind,
  entityId,
  initialCount = 0,
  style,
  onChange,
}: {
  kind: Kind;
  entityId: string;
  initialCount?: number;
  style?: any;
  onChange?: (active: boolean) => void;
}) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!user) {
      setActive(false);
      return;
    }
    const url = kind === "dj" ? "/my/follows" : "/my/likes";
    api.get<string[]>(url)
      .then((r) => setActive(r.data.includes(entityId)))
      .catch(() => {});
  }, [user, entityId, kind]);

  const toggle = async () => {
    if (!user || busy) return;
    const next = !active;
    setActive(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      const path = `/${ENDPOINT[kind]}/${entityId}/${ACTION[kind]}`;
      if (next) {
        await api.post(path);
      } else {
        await api.delete(path);
      }
      onChange?.(next);
    } catch {
      // revert on error
      setActive(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  const iconName =
    kind === "dj"
      ? active ? "person-remove" : "person-add"
      : active ? "heart" : "heart-outline";
  const label =
    kind === "dj"
      ? active ? "Seguito" : "Segui"
      : active ? "Salvato" : "Mi piace";

  return (
    <TouchableOpacity
      testID={`${kind}-fav-btn`}
      onPress={toggle}
      disabled={busy}
      activeOpacity={0.85}
      style={[
        styles.btn,
        active ? styles.btnActive : styles.btnIdle,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={active ? "#fff" : colors.brand} size="small" />
      ) : (
        <>
          <Ionicons
            name={iconName as any}
            size={16}
            color={active ? "#fff" : colors.brand}
          />
          <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          {count > 0 ? (
            <Text style={[styles.count, active && styles.labelActive]}>
              {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  btnIdle: { borderColor: colors.brand, backgroundColor: "transparent" },
  btnActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  label: { color: colors.brand, fontWeight: "800", fontSize: 13 },
  labelActive: { color: "#fff" },
  count: { color: colors.brand, fontWeight: "700", fontSize: 12, marginLeft: 2 },
});
