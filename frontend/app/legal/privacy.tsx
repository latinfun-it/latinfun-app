import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../../src/theme";

export default function PrivacyPolicy() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="legal-back">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Privacy Policy — LatinFun</Text>
        <Text style={styles.meta}>Ultimo aggiornamento: 28 aprile 2026</Text>

        <Text style={styles.h2}>1. Titolare del trattamento</Text>
        <Text style={styles.p}>
          LatinFun è gestita da <Text style={styles.b}>Latinos Unidos Edizioni Musicali di Mauro G. Catalini</Text>.{"\n"}
          P.IVA: 03738320401{"\n"}
          Sede legale: San Giovanni in Marignano (RN), Italia{"\n"}
          Email: latinfunofficial@gmail.com{"\n"}
          PEC: maurocatalini@pec.it
        </Text>

        <Text style={styles.h2}>2. Dati raccolti</Text>
        <Text style={styles.p}>
          • Dati di registrazione: nome, email, password (hashata con bcrypt){"\n"}
          • Dati automatici: indirizzo IP, token JWT, posizione approssimata (con consenso), token push Expo, log di accesso{"\n"}
          • Contenuti utente: profili DJ/scuole, eventi creati, like, follow, messaggi{"\n"}
          • Pagamenti gestiti da Stripe Inc. — non conserviamo dati di pagamento sui nostri server
        </Text>

        <Text style={styles.h2}>3. Finalità</Text>
        <Text style={styles.p}>
          Erogazione del servizio (esecuzione contratto), notifiche push geolocalizzate (consenso), sicurezza e prevenzione frodi (legittimo interesse), elaborazione pagamenti BOOST e Lead, comunicazioni di servizio.
        </Text>

        <Text style={styles.h2}>4. Conservazione</Text>
        <Text style={styles.p}>
          Account attivi: fin quando esistono. Dopo cancellazione: eliminati entro 30 giorni (eccetto obblighi fiscali). Log: 12 mesi. Token push scaduti: cancellati automaticamente.
        </Text>

        <Text style={styles.h2}>5. Condivisione</Text>
        <Text style={styles.p}>
          Non vendiamo i tuoi dati. Condividiamo solo con: Stripe (pagamenti), Expo Push Service (notifiche), MongoDB Atlas (database). Trasferimenti extra-UE coperti da Clausole Contrattuali Standard (SCC).
        </Text>

        <Text style={styles.h2}>6. Diritti GDPR</Text>
        <Text style={styles.p}>
          Puoi esercitare i diritti di accesso, rettifica, cancellazione, opposizione, portabilità e revoca consenso scrivendo a <Text style={styles.b}>latinfunofficial@gmail.com</Text>. Puoi inoltre presentare reclamo al Garante per la protezione dei dati personali.
        </Text>

        <Text style={styles.h2}>7. Cookie</Text>
        <Text style={styles.p}>
          L'app mobile non usa cookie. L'unico dato locale è il token JWT, cancellato al logout.
        </Text>

        <Text style={styles.h2}>8. Minori</Text>
        <Text style={styles.p}>
          LatinFun non è destinata a minori di 14 anni. Eventuali dati raccolti senza consenso dei genitori saranno eliminati immediatamente.
        </Text>

        <Text style={styles.h2}>9. Sicurezza</Text>
        <Text style={styles.p}>
          Password hashate (bcrypt), HTTPS/TLS 1.3, token a scadenza, accesso limitato al personale autorizzato, backup cifrati.
        </Text>

        <Text style={styles.h2}>10. Modifiche</Text>
        <Text style={styles.p}>
          Pubblicheremo eventuali modifiche in questa pagina con la nuova data di aggiornamento. Per modifiche sostanziali ti avviseremo via email o in-app.
        </Text>

        <Text style={[styles.p, { marginTop: spacing.xl, textAlign: "center" }]}>
          Hai domande? Scrivici a{"\n"}
          <Text style={styles.b}>latinfunofficial@gmail.com</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5, marginBottom: 4 },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.lg },
  h2: { color: colors.brand, fontSize: 15, fontWeight: "800", marginTop: spacing.lg, marginBottom: 6 },
  p: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  b: { fontWeight: "800", color: "#fff" },
});
