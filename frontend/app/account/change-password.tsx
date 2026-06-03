import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api";
import { colors, spacing, radius } from "../../src/theme";

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const onSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Errore", "Compila tutti i campi");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Password debole", "La nuova password deve avere almeno 8 caratteri");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Errore", "Le due password non corrispondono");
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert("Errore", "La nuova password deve essere diversa dalla precedente");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (r.data?.ok) {
        Alert.alert("Successo", "Password aggiornata con successo!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert(
        "Errore",
        e?.response?.data?.detail || "Impossibile aggiornare la password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: "Cambia Password",
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8, paddingVertical: 6 }}
              testID="change-pwd-back"
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.iconBox}>
              <Ionicons name="lock-closed" size={48} color={colors.brand} />
            </View>
            <Text style={styles.title}>Cambia la tua password</Text>
            <Text style={styles.subtitle}>
              Per sicurezza inserisci la password attuale, poi scegline una nuova di almeno 8 caratteri.
            </Text>

            <Text style={styles.label}>Password attuale</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showOld}
                placeholder="••••••••"
                placeholderTextColor="#666"
                autoCapitalize="none"
                testID="change-pwd-current"
              />
              <TouchableOpacity onPress={() => setShowOld((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showOld ? "eye-off" : "eye"} size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nuova password</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="Almeno 8 caratteri"
                placeholderTextColor="#666"
                autoCapitalize="none"
                testID="change-pwd-new"
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Conferma nuova password</Text>
            <TextInput
              style={[styles.input, { paddingHorizontal: 14 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNew}
              placeholder="Ripeti la nuova password"
              placeholderTextColor="#666"
              autoCapitalize="none"
              testID="change-pwd-confirm"
            />

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={onSubmit}
              disabled={loading}
              testID="change-pwd-submit"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Aggiorna Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingTop: spacing.xl },
  iconBox: { alignItems: "center", marginBottom: spacing.md },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  subtitle: { color: "#aaa", fontSize: 13, textAlign: "center", marginBottom: spacing.lg, paddingHorizontal: 8 },
  label: { color: "#bbb", fontSize: 13, fontWeight: "700", marginBottom: 6, marginTop: spacing.md },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  btn: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
