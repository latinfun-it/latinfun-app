import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../src/player";
import { colors, radii } from "../src/theme";

export default function MiniPlayer() {
  const router = useRouter();
  const { currentMix, isPlaying, toggle, stop } = usePlayer();
  if (!currentMix) return null;

  return (
    <TouchableOpacity
      testID="mini-player"
      activeOpacity={0.9}
      onPress={() => router.push("/(tabs)/radio")}
      style={styles.wrap}
    >
      <Image source={{ uri: currentMix.cover_url }} style={styles.cover} />
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.title}>
          {currentMix.title}
        </Text>
        <Text numberOfLines={1} style={styles.sub}>
          {currentMix.dj_name} - live mix
        </Text>
      </View>
      <TouchableOpacity
        testID="mini-player-toggle"
        onPress={toggle}
        hitSlop={8}
        style={styles.btn}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity testID="mini-player-stop" onPress={stop} hitSlop={8} style={styles.closeBtn}>
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    shadowColor: colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  cover: { width: 46, height: 46, borderRadius: 10, backgroundColor: "#333" },
  info: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
