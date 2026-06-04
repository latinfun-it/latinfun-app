import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5, FontAwesome } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { colors } from "../src/theme";

type IconRow = { label: string; lib: string; name: string; recommended?: boolean };

const ICONS: IconRow[] = [
  // CUORE + PERSONE (più caldo, emozionale)
  { label: "1) Cuore puro (Ionicons)", lib: "ion", name: "heart" },
  { label: "2) Cuore con dentro persona (MaterialComm)", lib: "mci", name: "account-heart" },
  { label: "3) Cuori multipli (MaterialComm)", lib: "mci", name: "heart-multiple" },
  { label: "4) Cuore battente (MaterialComm)", lib: "mci", name: "heart-pulse", recommended: true },
  { label: "5) Cuori uno dentro l'altro (Ion)", lib: "ion", name: "heart-half-sharp" },
  
  // BALLO / SCARPE
  { label: "6) Scarpa col tacco (MaterialComm)", lib: "mci", name: "shoe-heel" },
  { label: "7) Maschera di carnevale (FontAwesome5)", lib: "fa", name: "mask" },
  { label: "8) Musica + nota (MaterialComm)", lib: "mci", name: "music-note" },
  
  // CONNECT / SOCIAL  
  { label: "9) Cuori che si abbracciano (FontAwesome5)", lib: "fa", name: "hand-holding-heart" },
  { label: "10) Persone + cuore (FontAwesome5)", lib: "fa", name: "people-arrows", recommended: true },
  { label: "11) Frecce coppia (FontAwesome5)", lib: "fa", name: "exchange-alt" },
  
  // FUOCO / FIAMMA (Latin passion!)
  { label: "12) 🔥 Fiamma passione (MaterialComm)", lib: "mci", name: "fire", recommended: true },
  { label: "13) 🔥 Fuoco Ionicons", lib: "ion", name: "flame" },
  
  // SPARK / STELLA
  { label: "14) ✨ Sparkles (Ionicons)", lib: "ion", name: "sparkles" },
  { label: "15) 💫 Stella shooting (MaterialComm)", lib: "mci", name: "star-shooting" },
  
  // DUE PERSONE FACING
  { label: "16) Account multiple plus (MaterialComm)", lib: "mci", name: "account-multiple-plus" },
  { label: "17) Saluto handshake (FontAwesome5)", lib: "fa", name: "handshake" },
  { label: "18) Coppia che si incontra (MaterialComm)", lib: "mci", name: "human-greeting-proximity" },
];

function IconRender({ row, color, size }: { row: IconRow; color: string; size: number }) {
  if (row.lib === "mci") return <MaterialCommunityIcons name={row.name as any} size={size} color={color} />;
  if (row.lib === "ion") return <Ionicons name={row.name as any} size={size} color={color} />;
  if (row.lib === "fa") return <FontAwesome5 name={row.name as any} size={size} color={color} />;
  if (row.lib === "fa4") return <FontAwesome name={row.name as any} size={size} color={color} />;
  return null;
}

export default function MatchIconPreview2() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Icone MATCH v2" }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.h1}>🎨 Nuove opzioni icona MATCH</Text>
        <Text style={styles.sub}>
          Più emozionali e meno "tecniche". ⭐ = miei consigli
        </Text>

        {ICONS.map((row, i) => (
          <View key={i} style={[styles.card, row.recommended && styles.recommendedCard]}>
            <Text style={styles.label}>{row.label} {row.recommended && "⭐"}</Text>
            <View style={styles.previewRow}>
              <View style={styles.bigPreview}>
                <IconRender row={row} color={colors.brand} size={56} />
              </View>
              <View style={styles.tabBarBox}>
                <View style={styles.fakeTab}>
                  <IconRender row={row} color={colors.brand} size={24} />
                  <Text style={styles.tabLabel}>MATCH</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 6 },
  sub: { color: "#aaa", fontSize: 14, marginBottom: 20 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 14, marginBottom: 12 },
  recommendedCard: { borderWidth: 2, borderColor: colors.brand },
  label: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 10 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  bigPreview: { alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#000", borderRadius: 12, minWidth: 110, height: 100 },
  tabBarBox: { flex: 1, backgroundColor: "rgba(5,5,5,0.96)", borderRadius: 10, padding: 8, borderTopWidth: 1, borderTopColor: "#333" },
  fakeTab: { alignItems: "center", padding: 6 },
  tabLabel: { color: colors.brand, fontSize: 11, fontWeight: "700", marginTop: 4 },
});
