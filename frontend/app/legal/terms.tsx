import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../../src/theme";

export default function Terms() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="terms-back">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Termini di Servizio</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Termini di Servizio — LatinFun</Text>
        <Text style={styles.meta}>Ultimo aggiornamento: 28 aprile 2026</Text>

        <Text style={styles.h2}>1. Oggetto</Text>
        <Text style={styles.p}>
          Questi Termini regolano l'utilizzo dell'applicazione mobile e web <Text style={styles.b}>LatinFun</Text>, gestita da <Text style={styles.b}>Latinos Unidos Edizioni Musicali di Mauro Germano Catalini</Text> — P.IVA 03738320401 — sede in San Giovanni in Marignano (RN), Italia.
        </Text>

        <Text style={styles.h2}>2. Descrizione del Servizio</Text>
        <Text style={styles.p}>
          LatinFun permette di scoprire eventi, DJ e scuole di ballo della scena latina in Italia, creare profili, acquistare pacchetti BOOST tramite Stripe, ricevere notifiche push geolocalizzate, fare match con altri ballerini e contattare scuole verificate.
        </Text>

        <Text style={styles.h2}>3. Registrazione</Text>
        <Text style={styles.p}>
          Devi avere almeno 14 anni. Devi fornire dati veritieri. Sei responsabile della sicurezza della tua password. Puoi cancellare l'account in qualsiasi momento.
        </Text>

        <Text style={styles.h2}>4. Contenuti dell'utente</Text>
        <Text style={styles.p}>
          Sei responsabile dei contenuti che pubblichi. Vietati: contenuti illeciti, diffamatori, sessuali o di odio; materiale coperto da copyright; dati falsi; spam. LatinFun rimuoverà contenuti che violano questi termini.
        </Text>

        <Text style={styles.h2}>5. Pacchetti BOOST e Lead</Text>
        <Text style={styles.p}>
          Acquisti una tantum (no abbonamenti). Pagamenti gestiti da Stripe Inc.{"\n\n"}
          BOOST: 7 giorni 4,99€ — 30 giorni 14,99€ — 90 giorni 34,99€ — 180 giorni 59,99€ — 365 giorni 99,99€{"\n"}
          Lead scuole: 2,00€ per contatto verificato.{"\n\n"}
          Diritto di recesso: dato che il servizio è immediatamente fruibile, rinunci esplicitamente al recesso di 14 giorni ai sensi dell'art. 59 lett. a) Codice del Consumo. Rimborsi solo per malfunzionamento tecnico imputabile a LatinFun.
        </Text>

        <Text style={styles.h2}>6. Utilizzo corretto</Text>
        <Text style={styles.p}>
          Vietati: bot, reverse engineering, bypass di sicurezza, rivendita del Servizio, uso per attività illegali.
        </Text>

        <Text style={styles.h2}>7. Proprietà intellettuale</Text>
        <Text style={styles.p}>
          Marchio, logo, design e codice di LatinFun sono di proprietà esclusiva di Latinos Unidos Edizioni Musicali di Mauro Germano Catalini. I contenuti utenti restano degli utenti, che concedono a LatinFun una licenza gratuita non esclusiva per la pubblicazione nell'ambito del Servizio.
        </Text>

        <Text style={styles.h2}>8. Disponibilità</Text>
        <Text style={styles.p}>
          LatinFun si impegna a mantenere il Servizio disponibile, ma non garantisce assenza di interruzioni o malfunzionamenti.
        </Text>

        <Text style={styles.h2}>9. Limitazione di responsabilità</Text>
        <Text style={styles.p}>
          Nei limiti consentiti dalla legge, LatinFun non è responsabile per: qualità o legalità degli eventi di terzi, rapporti tra utenti, perdite di dati per cause esterne, contenuti pubblicati dagli utenti.
        </Text>

        <Text style={styles.h2}>10. Risoluzione</Text>
        <Text style={styles.p}>
          LatinFun può sospendere o chiudere account in caso di violazione dei Termini, su richiesta dell'utente, o per inattività superiore a 24 mesi.
        </Text>

        <Text style={styles.h2}>11. Modifiche</Text>
        <Text style={styles.p}>
          Possiamo aggiornare questi Termini comunicandolo via email o in-app. L'uso continuato dopo le modifiche costituisce accettazione.
        </Text>

        <Text style={styles.h2}>12. Legge e Foro competente</Text>
        <Text style={styles.p}>
          Questi Termini sono regolati dalla <Text style={styles.b}>legge italiana</Text>. Foro competente: <Text style={styles.b}>Rimini</Text> (salvo diversa disposizione di legge a tutela del consumatore).
        </Text>

        <Text style={[styles.p, { marginTop: spacing.xl, textAlign: "center" }]}>
          Contatti{"\n"}
          <Text style={styles.b}>latinfunofficial@gmail.com</Text>{"\n"}
          PEC: <Text style={styles.b}>maurocatalini@pec.it</Text>
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
