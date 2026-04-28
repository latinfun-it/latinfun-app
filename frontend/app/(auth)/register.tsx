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
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { colors, radii, spacing } from "../../src/theme";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!name || !email || password.length < 6) {
      setError("Nome, email e password (min 6 caratteri) sono obbligatori");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), referralCode.trim() || undefined);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root} testID="register-screen">
      <Image
        source={{ uri: "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg" }}
        style={StyleSheet.absoluteFillObject}
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
              <Text style={styles.tagline}>Unisciti alla scena</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Crea il tuo account</Text>
              <Text style={styles.subtitle}>Eventi, DJ, mix: tutto in un posto.</Text>

              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  testID="register-name"
                  placeholder="Nome e cognome"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  testID="register-email"
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
                  testID="register-password"
                  placeholder="Password (min 6 caratteri)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.inputRow}>
                <Ionicons name="gift-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  testID="register-referral"
                  placeholder="Codice referral (opzionale)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="characters"
                  maxLength={12}
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase())}
                />
              </View>

              {error ? (
                <Text style={styles.error} testID="register-error">
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                testID="register-submit"
                style={styles.primaryBtn}
                onPress={onSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Crea account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Hai gia un account?</Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity testID="go-to-login">
                    <Text style={styles.linkText}> Accedi</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: "space-between" },
  brandBox: { marginTop: spacing.xxl },
  logoMark: { color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1.5 },
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
});
