import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { colors } from "../src/theme";

type IconRow = {
  id: string;
  label: string;
  desc: string;
  lib: "mci" | "ion" | "fa";
  name: string;
  vibe: string;
};

const ICONS: IconRow[] = [
  {
    id: "A",
    label: "A — Fiamma 🔥",
    desc: "Passione latina pura, alto contrasto, leggibile a 24px",
    lib: "mci",
    name: "fire",
    vibe: "Hot · Energia",
  },
  {
    id: "B",
    label: "B — Cuore battente",
    desc: "Cuore con linea ECG: 'connessione che pulsa'",
    lib: "mci",
    name: "heart-pulse",
    vibe: "Romantico · Vivo",
  },
  {
    id: "C",
    label: "C — Cuore semplice",
    desc: "Classico Tinder/Bumble — universale, riconoscibile",
    lib: "ion",
    name: "heart",
    vibe: "Dating · Classic",
  },
  {
    id: "D",
    label: "D — Coppia che si avvicina",
    desc: "Due figure faccia a faccia (saluto/incontro)",
    lib: "mci",
    name: "human-greeting-proximity",
    vibe: "Sociale · Incontro",
  },
  {
    id: "E",
    label: "E — Persone + frecce (Match)",
    desc: "Letteralmente 'connessione tra due persone'",
    lib: "fa",
    name: "people-arrows",
    vibe: "Match · Connect",
  },
  {
    id: "F",
    label: "F — Mano che tiene cuore",
    desc: "Caldo, accogliente, 'offri il cuore al partner'",
    lib: "fa",
    name: "hand-holding-heart",
    vibe: "Caldo · Affettuoso",
  },
  {
    id: "G",
    label: "G — Cuori multipli",
    desc: "Più cuori = più match, dinamico",
    lib: "mci",
    name: "heart-multiple",
    vibe: "Social · Multi-match",
  },
  {
    id: "H",
    label: "H — Sparkles ✨",
    desc: "Magia, 'la scintilla', moderno (stile iOS/AI)",
    lib: "ion",
    name: "sparkles",
    vibe: "Magic · Trendy",
  },
];

function IconRender({ row, color, size }: { row: IconRow; color: string; size: number }) {
  if (row.lib === "mci") return <MaterialCommunityIcons name={row.name as any} size={size} color={color} />;
  if (row.lib === "ion") return <Ionicons name={row.name as any} size={size} color={color} />;
  return <FontAwesome5 name={row.name as any} size={size} color={color} />;
}

export default function MatchIconPreview3() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Scegli icona MATCH" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={styles.h1}>💃🕺 Icona Tab MATCH</Text>
        <Text style={styles.sub}>
          Tocca quella che preferisci. Vedrai come appare nel tab in basso (anteprima realistica).
        </Text>

        {ICONS.map((row) => {
          const selected = picked === row.id;
          return (
            <Pressable
              key={row.id}
              onPress={() => setPicked(row.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.headerRow}>
                <Text style={styles.label}>{row.label}</Text>
                {selected && <Text style={styles.check}>✓ SCELTA</Text>}
              </View>
              <Text style={styles.desc}>{row.desc}</Text>
              <Text style={styles.vibe}>{row.vibe}</Text>

              <View style={styles.previewRow}>
                <View style={styles.bigPreview}>
                  <IconRender row={row} color={colors.brand} size={64} />
                </View>

                {/* Mock realistico della tab bar a 5 voci */}
                <View style={styles.tabBarBox}>
                  <View style={styles.tab}>
                    <Ionicons name="home" size={20} color="#888" />
                    <Text style={styles.tabLabelOff}>Home</Text>
                  </View>
                  <View style={styles.tab}>
                    <Ionicons name="calendar" size={20} color="#888" />
                    <Text style={styles.tabLabelOff}>Eventi</Text>
                  </View>
                  <View style={styles.tab}>
                    <Ionicons name="restaurant" size={20} color="#888" />
                    <Text style={styles.tabLabelOff}>Locali</Text>
                  </View>
                  <View style={styles.tab}>
                    <IconRender row={row} color={colors.brand} size={22} />
                    <Text style={styles.tabLabelOn}>Match</Text>
                  </View>
                  <View style={styles.tab}>
                    <Ionicons name="person" size={20} color="#888" />
                    <Text style={styles.tabLabelOff}>Profilo</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}

        {picked && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>
              Hai scelto: <Text style={{ color: colors.brand, fontWeight: "900" }}>{picked}</Text>
              {"\n"}Scrivimi "{picked}" in chat e procedo!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 6 },
  sub: { color: "#bbb", fontSize: 14, marginBottom: 18, lineHeight: 20 },
  card: {
    backgroundColor: "#161616",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: colors.brand, backgroundColor: "#1f1410" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#fff", fontSize: 16, fontWeight: "800" },
  check: { color: colors.brand, fontWeight: "900", fontSize: 13 },
  desc: { color: "#aaa", fontSize: 13, marginTop: 4 },
  vibe: { color: colors.brand, fontSize: 11, fontWeight: "700", marginTop: 4, letterSpacing: 0.5 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  bigPreview: {
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: "#000",
    borderRadius: 14,
    width: 110,
    height: 100,
  },
  tabBarBox: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(5,5,5,0.98)",
    borderRadius: 12,
    padding: 6,
    borderTopWidth: 1,
    borderTopColor: "#222",
    justifyContent: "space-between",
  },
  tab: { alignItems: "center", padding: 4, flex: 1 },
  tabLabelOff: { color: "#888", fontSize: 9, marginTop: 2, fontWeight: "600" },
  tabLabelOn: { color: colors.brand, fontSize: 9, marginTop: 2, fontWeight: "900" },
  resultBox: {
    backgroundColor: colors.brand,
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  resultText: { color: "#000", fontWeight: "800", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
