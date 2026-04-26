# LatinFun — Guida al Deploy

Questa guida copre i **due percorsi di deploy** disponibili per LatinFun.

---

## 🌐 A) Deploy Web su Emergent (rapido)

La build web statica di LatinFun viene pubblicata automaticamente dalla piattaforma Emergent.

### Passi
1. Vai nell'interfaccia Emergent di questa chat.
2. Clicca il pulsante **"Deploy"** (in alto a destra).
3. Attendi che la build completi (2–5 min).
4. L'app sarà raggiungibile dall'URL pubblico che Emergent ti fornisce.

### Cosa è già pronto
- ✅ Backend FastAPI su `/api/*` (Kubernetes ingress)
- ✅ Frontend Expo compilato in `web` statico (`"output": "static"` in `app.json`)
- ✅ MongoDB in container
- ✅ Variabili d'ambiente protette (`.env`)
- ✅ CORS aperto, JWT auth, Stripe, push geolocalizzate

> **Nota**: Il health check del Deployment Agent è già stato eseguito con esito positivo. I due "blocker" segnalati erano falsi positivi (vedi commenti nella chat).

---

## 📱 B) Build native per App Store e Play Store (EAS)

Richiede un **account Expo** (gratuito) e, per pubblicare sugli store:
- **Apple Developer Program** ($99/anno) → App Store
- **Google Play Console** ($25 una tantum) → Play Store

### Prerequisiti (una tantum)
```bash
npm install -g eas-cli
cd /app/frontend
eas login                     # login con account Expo
eas init --id=<opzionale>     # crea il progetto su expo.dev e popola extra.eas.projectId
```

Dopo `eas init`, apri `/app/frontend/app.json` e **sostituisci**:
- `"owner": "REPLACE_WITH_EXPO_USERNAME"` → il tuo username Expo
- `"projectId": "REPLACE_WITH_EAS_PROJECT_ID_AFTER_INIT"` → il project ID che `eas init` ha restituito

### 1️⃣ Build di anteprima interna (APK Android + IPA ad-hoc iOS)
Utile per testare su dispositivo prima di pubblicare.
```bash
cd /app/frontend
eas build --profile preview --platform android     # produce un .apk installabile
eas build --profile preview --platform ios         # richiede iOS dev profile / TestFlight
```

### 2️⃣ Build di produzione (per gli store)
```bash
eas build --profile production --platform all      # AAB Android + IPA iOS
```
- **Android** → `buildType: "app-bundle"` (AAB richiesto da Google)
- **iOS** → build firmata pronta per App Store Connect
- `autoIncrement: true` incrementa automaticamente `versionCode`/`buildNumber`

### 3️⃣ Submit automatico agli store
Prima compila in `/app/frontend/eas.json` la sezione `submit.production`:
```json
"ios": {
  "appleId": "tua@email.com",
  "ascAppId": "1234567890",         // App Store Connect App ID
  "appleTeamId": "XXXXXXXXXX"       // Apple Team ID
}
```
Per Android, scarica il **service account JSON** da Google Play Console
(API access → service accounts) e salvalo come `/app/frontend/google-play-service-account.json`.

Poi:
```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

---

## ⚙️ Configurazione già inserita

### `app.json` (identità)
- `name`: **LatinFun**
- `slug`: `latinfun`
- `version`: `1.0.0`
- `ios.bundleIdentifier`: `it.latinfun.app`
- `android.package`: `it.latinfun.app`
- Permessi iOS: Location, Photo Library, Camera (con descrizioni in italiano)
- Permessi Android: `ACCESS_*_LOCATION`, `POST_NOTIFICATIONS`
- Plugin: `expo-router`, `expo-location`, `expo-splash-screen`, `expo-image-picker`, `expo-notifications`

### `eas.json` (profili build)
- `development` — sim iOS + dev client, per sviluppo
- `preview` — APK Android + IPA ad-hoc, per test interni
- `production` — AAB + IPA firmati per store, auto-increment version

### Backend URL per le build native
- **preview** → punta all'URL Emergent (`dj-italia-hub.preview...`)
- **production** → punta a `https://api.latinfun.it` (aggiorna quando il dominio di prod è pronto)

---

## ✅ Checklist pre-pubblicazione store

### iOS App Store
- [ ] Apple Developer account attivo
- [ ] Icona 1024×1024 per App Store (in `./assets/images/icon.png`) ✅
- [ ] Screenshot 6.7" + 5.5" device (`eas build:inspect` oppure Xcode simulator)
- [ ] Privacy Policy URL (richiesta)
- [ ] Descrizione app (IT + EN)
- [ ] Keywords
- [ ] Categoria: *Music* o *Entertainment*
- [ ] Età consigliata: 12+ (per contenuti eventi notturni)

### Google Play Store
- [ ] Google Play Console attivo
- [ ] Icona adaptive 512×512 ✅
- [ ] Screenshot phone (min 2) + tablet (opz)
- [ ] Feature graphic 1024×500
- [ ] Privacy Policy URL
- [ ] Data safety form compilato (location, photos, email)
- [ ] Content rating questionnaire

---

## 🆘 Troubleshooting comuni

| Errore | Soluzione |
|---|---|
| `eas init` fallisce con "not logged in" | `eas login` prima |
| Build iOS fallisce per mancato certificato | Lascia che EAS gestisca automaticamente con `eas credentials` |
| `"projectId" is required` | Esegui `eas init` e aggiorna `app.json` |
| Push notifications non arrivano su iOS prod | Serve APNs key caricato su Expo (`eas credentials` → iOS → Push) |
| App respinta per "unused permission" | Rimuovi dal `infoPlist` permessi non usati |

---

## 📞 Supporto
- Docs EAS: https://docs.expo.dev/build/introduction/
- Docs Submit: https://docs.expo.dev/submit/introduction/
- Expo Discord: https://chat.expo.dev/
