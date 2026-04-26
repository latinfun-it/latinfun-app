import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Inserisci email e password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root} testID="login-screen">
      <Image
        source={{ uri: "https://images.pexels.com/photos/1540338/pexels-photo-1540338.jpeg" }}
        style={styles.bg}
      />
      <LinearGradient
        colors={["rgba(5,5,5,0.4)", "rgba(5,5,5,0.85)", "#050505"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.brandBox}>
              <Text style={styles.logoMark}>LATIN<Text style={{ color: colors.brand }}>FUN</Text></Text>
              <Text style={styles.tagline}>Il battito della musica latina in Italia</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Bentornato</Text>
              <Text style={styles.subtitle}>Accedi per vivere la scena</Text>

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  testID="login-email"
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  testID="login-password"
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {error ? (
                <Text style={styles.error} testID="login-error">
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                testID="login-submit"
                style={styles.primaryBtn}
                onPress={onSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Accedi</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Non hai un account?</Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity testID="go-to-register">
                    <Text style={styles.linkText}> Registrati</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text style={styles.demoHint}>
                Demo admin: admin@latinfun.it / admin123
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: "space-between" },
  brandBox: { marginTop: spacing.xxl, alignItems: "flex-start" },
  logoMark: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1.5,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-black" }),
  },
  tagline: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: { flex: 1, color: "#fff", paddingVertical: 14, paddingLeft: 10, fontSize: 15 },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  footerText: { color: colors.textSecondary },
  linkText: { color: colors.brand, fontWeight: "700" },
  error: { color: colors.error, marginBottom: spacing.sm, fontSize: 13 },
  demoHint: { color: colors.textMuted, textAlign: "center", marginTop: spacing.md, fontSize: 12 },
});
