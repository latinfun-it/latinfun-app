import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

/**
 * Stelline di valutazione 1-5.
 * - readonly: solo visualizzazione (mostra rating mediato)
 * - editable: l'utente puo' toccare per scegliere il proprio rating
 */
export default function RatingStars({
  value = 0,
  size = 16,
  editable = false,
  onChange,
  showNumber = false,
  count,
}: {
  value?: number;
  size?: number;
  editable?: boolean;
  onChange?: (n: number) => void;
  showNumber?: boolean;
  count?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((s) => {
        const filled = value >= s;
        const half = !filled && value >= s - 0.5;
        const StarWrap = editable ? TouchableOpacity : Pressable;
        return (
          <StarWrap
            key={s}
            disabled={!editable}
            onPress={editable ? () => onChange?.(s) : undefined}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Ionicons
              name={filled ? "star" : half ? "star-half" : "star-outline"}
              size={size}
              color={filled || half ? colors.gold : colors.textMuted}
              style={{ marginRight: 2 }}
            />
          </StarWrap>
        );
      })}
      {showNumber && value > 0 ? (
        <Text style={[styles.label, { fontSize: Math.round(size * 0.78) }]}>
          {value.toFixed(1)}
          {typeof count === "number" ? ` · ${count}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: "700",
  },
});
