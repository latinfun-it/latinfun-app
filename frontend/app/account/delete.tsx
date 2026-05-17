import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useAuth } from "../../src/auth";
import { useI18n } from "../../src/i18n";
import { api } from "../../src/api";
import { colors, radii, spacing } from "../../src/theme";

const CONFIRM_WORD_IT = "ELIMINA";
const CONFIRM_WORD_ES = "ELIMINAR";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { lang } = useI18n();
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEs = lang === "es";
  const confirmWord = isEs ? CONFIRM_WORD_ES : CONFIRM_WORD_IT;
  const canDelete = typed.trim().toUpperCase() === confirmWord && !submitting;

  const t = {
    title: isEs ? "Eliminar cuenta" : "Elimina account",
    headerWarn: isEs
      ? "Esta acción es permanente e irreversible."
      : "Questa azione è permanente e irreversibile.",
    intro: isEs
      ? "Al eliminar tu cuenta de LatinFun, todos tus datos personales serán eliminados permanentemente de nuestros servidores. No podemos recuperar tu cuenta una vez eliminada."
      : "Eliminando il tuo account LatinFun, tutti i tuoi dati personali saranno cancellati definitivamente dai nostri server. Non potremo ripristinare l'account una volta eliminato.",
    deletedTitle: isEs ? "Se eliminará lo siguiente:" : "Verrà eliminato quanto segue:",
    items: isEs
      ? [
          "Tu perfil de usuario (nombre, email)",
          "Todos los eventos que has creado",
          "Tu perfil de DJ (si has registrado uno)",
          "Tu escuela de baile (si has registrado una)",
          "Favoritos, follows, likes y playlists guardadas",
          "Reseñas y comentarios escritos por ti",
          "Mensajes y chats de Match Partner di Ballo",
          "Tu perfil de bailarín en Match Partner",
        ]
      : [
          "Il tuo profilo utente (nome, email)",
          "Tutti gli eventi che hai creato",
          "Il tuo profilo DJ (se ne hai registrato uno)",
          "La tua scuola di ballo (se ne hai registrata una)",
          "Preferiti, follow, like e playlist salvate",
          "Recensioni e commenti scritti da te",
          "Messaggi e chat di Match Partner di Ballo",
          "Il tuo profilo ballerino in Match Partner",
        ],
    noUndoTitle: isEs ? "No se puede deshacer" : "Operazione non reversibile",
    noUndoBody: isEs
      ? "Una vez confirmada la eliminación, no podrás iniciar sesión ni recuperar ningún dato. Si solo deseas dejar de recibir notificaciones, puedes desactivarlas desde la sección Notificaciones."
      : "Una volta confermata, non potrai più accedere né recuperare alcun dato. Se vuoi solo smettere di ricevere notifiche, puoi disattivarle dalla sezione Notifiche.",
    confirmLabel: isEs
      ? `Para confirmar, escribe la palabra "${confirmWord}" abajo:`
      : `Per confermare, scrivi la parola "${confirmWord}" qui sotto:`,
    placeholder: isEs ? `Escribe ${confirmWord}` : `Scrivi ${confirmWord}`,
    cancelBtn: isEs ? "Cancelar" : "Annulla",
    deleteBtn: isEs ? "Eliminar mi cuenta para siempre" : "Elimina il mio account per sempre",
    confirmTitle: isEs ? "¿Estás seguro?" : "Sei sicuro?",
    confirmMsg: isEs
      ? "Esta es la última oportunidad para cancelar. ¿Confirmas la eliminación definitiva de tu cuenta?"
      : "Questa è l'ultima possibilità per annullare. Confermi l'eliminazione definitiva del tuo account?",
    confirmYes: isEs ? "Sí, eliminar" : "Sì, elimina",
    confirmNo: isEs ? "No, vuelvo atrás" : "No, torno indietro",
    successTitle: isEs ? "Cuenta eliminada" : "Account eliminato",
    successMsg: isEs
      ? "Tu cuenta ha sido eliminada con éxito. Esperamos volver a verte pronto."
      : "Il tuo account è stato eliminato con successo. Speriamo di rivederti presto.",
    errTitle: isEs ? "Error" : "Errore",
    errMsg: isEs
      ? "No fue posible eliminar la cuenta. Inténtalo de nuevo o contáctanos en support@latinfun.it"
      : "Non è stato possibile eliminare l'account. Riprova o scrivi a support@latinfun.it",
    youAreAdmin: isEs
      ? "La cuenta de administrador no puede eliminarse desde esta pantalla por seguridad. Contacta al soporte."
      : "L'account amministratore non può essere eliminato da questa schermata per motivi di sicurezza. Contatta il supporto.",
  };

  const isAdmin = user?.role === "admin";

  const performDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete("/auth/me");
      // Log out and redirect to login
      await logout();
      Alert.alert(t.successTitle, t.successMsg, [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "";
      Alert.alert(t.errTitle, `${t.errMsg}\n\n${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const onPressDelete = () => {
    if (!canDelete) return;
    Alert.alert(t.confirmTitle, t.confirmMsg, [
      { text: t.confirmNo, style: "cancel" },
      { text: t.confirmYes, style: "destructive", onPress: performDelete },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="delete-account-screen">
      <Stack.Screen
        options={{
          title: t.title,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Big warning header */}
            <View style={styles.warnHeader}>
              <View style={styles.warnIconWrap}>
                <Ionicons name="warning" size={36} color="#fff" />
              </View>
              <Text style={styles.warnTitle}>{t.headerWarn}</Text>
            </View>

            {isAdmin ? (
              <View style={styles.adminBox} testID="admin-cannot-delete-warning">
                <Ionicons name="shield-outline" size={22} color={colors.gold} />
                <Text style={styles.adminText}>{t.youAreAdmin}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.intro}>{t.intro}</Text>

                <View style={styles.listBox}>
                  <Text style={styles.listTitle}>{t.deletedTitle}</Text>
                  {t.items.map((it, i) => (
                    <View key={i} style={styles.listRow}>
                      <Ionicons name="close-circle" size={16} color={colors.brand} />
                      <Text style={styles.listText}>{it}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.noticeBox}>
                  <Text style={styles.noticeTitle}>{t.noUndoTitle}</Text>
                  <Text style={styles.noticeBody}>{t.noUndoBody}</Text>
                </View>

                <Text style={styles.confirmLabel}>{t.confirmLabel}</Text>
                <TextInput
                  testID="delete-account-confirm-input"
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={t.placeholder}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.input}
                />

                <TouchableOpacity
                  testID="delete-account-confirm-btn"
                  disabled={!canDelete}
                  onPress={onPressDelete}
                  activeOpacity={0.85}
                  style={[styles.deleteBtn, !canDelete && { opacity: 0.4 }]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.deleteBtnText}>{t.deleteBtn}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              testID="delete-account-cancel-btn"
              onPress={() => router.back()}
              activeOpacity={0.85}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>{t.cancelBtn}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  warnHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
  warnIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  warnTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  listBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.lg,
  },
  listTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 5,
  },
  listText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  noticeBox: {
    backgroundColor: "rgba(229, 41, 71, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: spacing.lg,
  },
  noticeTitle: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  noticeBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  confirmLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 16,
    marginBottom: 12,
    minHeight: 52,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
  adminBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: spacing.lg,
  },
  adminText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
