import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { colors } from "../src/theme";

type IconRow = { label: string; lib: string; name: string };

const ICONS: IconRow[] = [
  { label: "A) Uomo-Donna semplice (MaterialComm)", lib: "mci", name: "human-male-female" },
  { label: "B) Coppia che balla (MaterialComm)", lib: "mci", name: "human-female-dance" },
  { label: "C) Uomo che balla (MaterialComm)", lib: "mci", name: "human-male-dance" },
  { label: "D) Stretta mano (Ionicons)", lib: "ion", name: "people" },
  { label: "E) Coppia con amico (MaterialComm)", lib: "mci", name: "account-group" },
  { label: "F) Coppia che si tiene per mano (Ionicons)", lib: "ion", name: "people-circle" },
  { label: "G) Uomo e Donna con cuore (FontAwesome)", lib: "fa", name: "people-arrows" },
  { label: "H) Coppia con cuore (FontAwesome)", lib: "fa", name: "user-friends" },
  { label: "I) Persone che ballano (MaterialComm)", lib: "mci", name: "human-greeting-variant" },
  { label: "L) Salsa coppia stilizzata (MaterialComm)", lib: "mci", name: "human-handsdown" },
];

function IconRender({ row, color, size }: { row: IconRow; color: string; size: number }) {
  if (row.lib === "mci") return <MaterialCommunityIcons name={row.name as any} size={size} color={color} />;
  if (row.lib === "ion") return <Ionicons name={row.name as any} size={size} color={color} />;
  if (row.lib === "fa") return <FontAwesome5 name={row.name as any} size={size} color={color} />;
  return null;
}

export default function MatchIconPreview() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Anteprima Icone MATCH" }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.h1}>🎨 Scegli l'icona per MATCH</Text>
        <Text style={styles.sub}>
          Apparirà nella tab bar in basso (dimensione 22-24px). Ecco come si vedrà:
        </Text>

        {ICONS.map((row, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.label}>{row.label}</Text>
            <View style={styles.previewRow}>
              <View style={styles.bigPreview}>
                <Text style={styles.bigLabel}>Anteprima grande:</Text>
                <IconRender row={row} color={colors.brand} size={48} />
              </View>
              <View style={styles.tabBarPreview}>
                <Text style={styles.bigLabel}>Come nella tab bar:</Text>
                <View style={styles.tabBarBox}>
                  <View style={styles.fakeTab}>
                    <IconRender row={row} color={colors.brand} size={22} />
                    <Text style={styles.tabLabel}>MATCH</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))}
        
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            💡 La mia preferita: <Text style={{fontWeight:"900"}}>opzione A "human-male-female"</Text> — chiara, universale, perfetta per "Partner di Ballo".
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 6 },
  sub: { color: "#aaa", fontSize: 14, marginBottom: 20 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, marginBottom: 14 },
  label: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 12 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  bigPreview: { alignItems: "center", padding: 12, backgroundColor: "#000", borderRadius: 12, minWidth: 110 },
  tabBarPreview: { flex: 1 },
  bigLabel: { color: "#777", fontSize: 11, marginBottom: 8 },
  tabBarBox: { backgroundColor: "rgba(5,5,5,0.96)", borderRadius: 10, padding: 8, borderTopWidth: 1, borderTopColor: "#333" },
  fakeTab: { alignItems: "center", padding: 6 },
  tabLabel: { color: colors.brand, fontSize: 11, fontWeight: "700", marginTop: 4 },
  tip: { backgroundColor: "rgba(255,71,87,0.12)", borderRadius: 12, padding: 14, marginTop: 8 },
  tipText: { color: "#fff", fontSize: 14 },
});
