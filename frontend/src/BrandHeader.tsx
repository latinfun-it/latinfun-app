import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "./theme";

/**
 * Header del brand LatinFun, riutilizzabile su tutte le pagine principali.
 * Mostra il logo wordmark "LATINFUN" e un'icona cuore (preferiti) cliccabile
 * per accedere rapidamente alla pagina /favorites.
 */
export default function BrandHeader({
  showFavorites = true,
  rightSlot,
}: {
  showFavorites?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.row}>
        <TouchableOpacity
          testID="brand-home-btn"
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/home" as any)}
          style={styles.logoWrap}
        >
          <Text style={styles.logo}>
            LATIN<Text style={styles.logoAccent}>FUN</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.right}>
          {rightSlot}
          {showFavorites ? (
            <TouchableOpacity
              testID="brand-favorites-btn"
              activeOpacity={0.85}
              onPress={() => router.push("/favorites" as any)}
              style={styles.heartBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="heart" size={22} color={colors.brand} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 52,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-black" }),
  },
  logoAccent: {
    color: colors.brand,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236,72,153,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
