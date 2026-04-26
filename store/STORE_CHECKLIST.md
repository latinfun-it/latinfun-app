# 📋 Checklist pubblicazione store — LatinFun

Spunta mano a mano che completi ogni voce.

---

## 🔧 Setup tecnico (FATTO ✅)
- [x] `app.json` con identità LatinFun configurata
- [x] `eas.json` con profili development/preview/production
- [x] Plugin Expo (router, location, splash, image-picker, notifications)
- [x] Permessi iOS con descrizioni italiane
- [x] Permessi Android dichiarati
- [x] Backend health check superato
- [x] Pulsante Elimina admin per pulizia contenuti di test

## 👤 Da fare prima della build
- [ ] Account Expo creato su [expo.dev/signup](https://expo.dev/signup)
- [ ] `eas login` eseguito dal terminale
- [ ] `eas init` eseguito → projectId ottenuto
- [ ] `app.json`: sostituito `REPLACE_WITH_EXPO_USERNAME` → tuo username
- [ ] `app.json`: sostituito `REPLACE_WITH_EAS_PROJECT_ID_AFTER_INIT` → projectId
- [ ] Eliminati eventi / DJ / scuole di test dalla DB

## 🎨 Asset grafici (alcuni già presenti)
- [x] Icona 1024×1024 (`./assets/images/icon.png`)
- [x] Adaptive icon Android (`./assets/images/adaptive-icon.png`)
- [x] Splash screen (`./assets/images/splash-icon.png`)
- [x] Favicon web (`./assets/images/favicon.png`)
- [ ] **Feature graphic Android** 1024×500 (da creare)
- [ ] **Screenshot iPhone** 6.7" x3, 6.5" x3, 5.5" x3
- [ ] **Screenshot Android** phone x3 minimo
- [ ] Video preview 15–30s (opzionale ma consigliato)

## 📝 Testi store (FATTI ✅ in `/app/store/`)
- [x] Descrizione IT (4000 char)
- [x] Descrizione EN (4000 char)
- [x] Sottotitolo/breve descrizione
- [x] Keywords
- [x] Categoria + classificazione età

## 📄 Documenti legali (OBBLIGATORI — template in `/app/store/`)
- [ ] **Privacy Policy** pubblicata su `https://latinfun.it/privacy`
  - Template pronto in `/app/store/PRIVACY_POLICY.md` → completa i campi `[...]` e pubblicala
- [ ] **Termini di Servizio** pubblicati su `https://latinfun.it/termini`
  - Template pronto in `/app/store/TERMS_OF_SERVICE.md`
- [ ] Decidere dove pubblicarli: sito web statico, Notion pubblico, GitHub Pages...
- [ ] URL sito web (anche placeholder va bene): `https://latinfun.it`

## 🔐 Account sviluppatore
### iOS
- [ ] **Apple Developer Program** attivato ($99/anno)
  - Registrati su [developer.apple.com](https://developer.apple.com/programs/)
- [ ] Creata **App ID** su https://developer.apple.com/account → Identifiers
  - Bundle ID: `it.latinfun.app`
- [ ] Creata **app su App Store Connect** → https://appstoreconnect.apple.com
  - ottieni `ascAppId` (numero 10 cifre)
- [ ] Recupera `appleTeamId` da [Membership](https://developer.apple.com/account) (10 caratteri alfanumerici)

### Android
- [ ] **Google Play Console** attivato ($25 una-tantum)
  - Registrati su [play.google.com/console](https://play.google.com/console)
- [ ] Creata app nella Console con package `it.latinfun.app`
- [ ] Scaricato **service account JSON** per submit automatico:
  1. API access → Create service account
  2. Scarica JSON
  3. Salvalo come `/app/frontend/google-play-service-account.json` (NON committare!)

## 🚀 Build e submit
### Preview (interno, per test)
- [ ] `eas build --profile preview --platform android` → APK
- [ ] Installa APK su dispositivo Android e testa
- [ ] `eas build --profile preview --platform ios` → TestFlight

### Production
- [ ] `eas build --profile production --platform all`
- [ ] `eas submit --profile production --platform android` (track: internal → poi promuovi)
- [ ] `eas submit --profile production --platform ios`

## ✅ Prima review
### App Store
- [ ] Creata versione 1.0.0 su App Store Connect
- [ ] Caricati screenshots e testi
- [ ] Creato account "review" con credenziali demo in `App Review Information`
- [ ] Compilata sezione "Declare Rights" → "I grant Apple..."
- [ ] Compilata sezione "Advertising Identifier" → **No**, non usiamo IDFA
- [ ] Invia per review (tempi: 24–48h)

### Play Store
- [ ] Compilata sezione **Data Safety** (vedi sotto)
- [ ] Compilato **Content rating questionnaire**
- [ ] Caricati screenshots e testi
- [ ] Pubblica in Internal Testing (visibile dopo 15 min)
- [ ] Poi promuovi a Production (review 3–7 giorni)

## 🔒 Data Safety (Play Store) — risposte pre-compilate
| Dato raccolto | Tipo | Condiviso con terze parti? | Opzionale? |
|---|---|---|---|
| Email | Account info | No | No (login) |
| Nome | Account info | No | No |
| Posizione approssimata | Location | No | Sì |
| Token push | Device info | Expo (US) | Sì |
| Dati pagamento | Financial | Stripe (US) | Solo se acquisti BOOST |
| Crash logs | App activity | No | No |

### Purposes
- Account functionality ✅
- App functionality (location) ✅
- Analytics ✅ (aggregate)
- Personalization (notifications) ✅

### Security practices
- [x] Data encrypted in transit (HTTPS)
- [x] User can request data deletion
- [x] Follows Play Families Policy: No (app per 12+)

---

## 🆘 Se la review viene rigettata

### Rejection comuni Apple
| Motivo | Soluzione |
|---|---|
| "Guideline 3.1.1 — In-App Purchase" | Spiegare che BOOST è servizio per eventi fisici (Sec. 3.1.3(e)) |
| "Guideline 5.1.1 — Privacy" | Controlla che Privacy Policy sia pubblica e copra tutti i dati |
| "Guideline 4.0 — Design" | Aggiungi più contenuti demo, screenshot migliori |
| "Guideline 2.1 — Info" | App Review Info incomplete → compila demo account |

### Rejection comuni Play
| Motivo | Soluzione |
|---|---|
| "Data Safety mismatch" | Allinea dichiarazioni con quello che l'app realmente raccoglie |
| "Target API level" | Assicurati targetSdkVersion 34+ (gestito automaticamente da Expo) |
| "Permission not justified" | Aggiungi spiegazione nella app description |

---

## 📊 Post-pubblicazione: monitoraggio
- [ ] Configura **App Store Connect → Analytics** per vedere download
- [ ] Configura **Play Console → Statistics**
- [ ] Configura alert Stripe Dashboard per notifiche pagamenti
- [ ] (Opzionale) Integra **Sentry** per error tracking in produzione
