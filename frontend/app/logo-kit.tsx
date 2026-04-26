import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { colors, radii, spacing } from "../src/theme";
import { LOGO_VARIANTS, LogoVariant } from "../src/logoKit";

type Format = "svg" | "png";

/** Convert SVG string → PNG data URL on web (canvas). */
async function svgToPngDataUrl(svg: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function LogoKit() {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const download = async (v: LogoVariant, fmt: Format) => {
    setBusyKey(`${v.key}:${fmt}`);
    try {
      const filename = `latinfun_${v.key}.${fmt}`;
      if (Platform.OS === "web") {
        if (fmt === "svg") {
          const blob = new Blob([v.svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } else {
          const dataUrl = await svgToPngDataUrl(
            v.svg,
            v.exportSize.width,
            v.exportSize.height
          );
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else {
        // Native: write SVG to cache and share. For PNG on native we write the raw SVG,
        // because a pure JS SVG->PNG rasterizer would require an extra dependency.
        const path = `${FileSystem.cacheDirectory}${filename.replace(/\.png$/, ".svg")}`;
        await FileSystem.writeAsStringAsync(path, v.svg, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(path, {
            mimeType: "image/svg+xml",
            dialogTitle: `${v.title} - LatinFun`,
          });
        } else {
          Alert.alert("Salvato", `File scritto in: ${path}`);
        }
      }
    } catch (e: any) {
      Alert.alert("Errore", e?.message || "Download fallito");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="logo-kit">
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="lk-back"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>KIT PROMO</Text>
            <Text style={styles.title}>Logo LatinFun</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
        <Text style={styles.lead}>
          Scarica i loghi ufficiali pronti da condividere. Ogni formato include l&apos;invito
          a scaricare l&apos;app da App Store e Google Play.
        </Text>

        {LOGO_VARIANTS.map((v) => {
          const isBanner = v.key === "banner";
          const previewW = isBanner ? 320 : 260;
          const previewH = previewW / v.aspect;
          return (
            <View key={v.key} style={styles.card} testID={`lk-card-${v.key}`}>
              <View style={{ alignItems: "center" }}>
                <View
                  style={[
                    styles.previewWrap,
                    { width: previewW, height: previewH },
                    v.key === "round" && { borderRadius: previewW / 2, overflow: "hidden" },
                  ]}
                >
                  <SvgXml xml={v.svg} width={previewW} height={previewH} />
                </View>
              </View>

              <Text style={styles.cardTitle}>{v.title}</Text>
              <Text style={styles.cardSub}>{v.subtitle}</Text>
              <Text style={styles.cardSize}>
                {v.exportSize.width} × {v.exportSize.height} px
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                {Platform.OS === "web" ? (
                  <TouchableOpacity
                    testID={`lk-${v.key}-png`}
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => download(v, "png")}
                    disabled={busyKey !== null}
                  >
                    {busyKey === `${v.key}:png` ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="image" size={16} color="#fff" />
                        <Text style={styles.btnText}>Scarica PNG</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  testID={`lk-${v.key}-svg`}
                  style={[
                    styles.btn,
                    Platform.OS === "web" ? styles.btnGhost : styles.btnPrimary,
                  ]}
                  onPress={() => download(v, "svg")}
                  disabled={busyKey !== null}
                >
                  {busyKey === `${v.key}:svg` ? (
                    <ActivityIndicator color={Platform.OS === "web" ? colors.brand : "#fff"} />
                  ) : (
                    <>
                      <Ionicons
                        name={Platform.OS === "web" ? "document-text" : "share-social"}
                        size={16}
                        color={Platform.OS === "web" ? colors.brand : "#fff"}
                      />
                      <Text
                        style={[
                          styles.btnText,
                          Platform.OS === "web" ? { color: colors.brand } : null,
                        ]}
                      >
                        {Platform.OS === "web" ? "SVG" : "Condividi"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={styles.usageBox}>
          <Ionicons name="information-circle" size={20} color={colors.gold} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.usageTitle}>Come usarlo</Text>
            <Text style={styles.usageDesc}>
              Usa il <Text style={{ color: "#fff", fontWeight: "800" }}>banner</Text> per copertine social e header siti,
              il <Text style={{ color: "#fff", fontWeight: "800" }}>quadrato</Text> per post Instagram e stories,
              il <Text style={{ color: "#fff", fontWeight: "800" }}>tondo</Text> per avatar e sticker WhatsApp.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  kicker: { color: colors.brand, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  lead: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 20 },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  previewWrap: {
    backgroundColor: "#000",
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 14,
  },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 16, marginTop: 6 },
  cardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 18 },
  cardSize: { color: colors.gold, fontSize: 11, marginTop: 6, fontWeight: "700", letterSpacing: 0.5 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  btnGhost: { backgroundColor: "transparent", borderColor: colors.brand },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  usageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 14,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    marginTop: 14,
  },
  usageTitle: { color: colors.gold, fontWeight: "800", fontSize: 13, marginBottom: 4 },
  usageDesc: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
});
