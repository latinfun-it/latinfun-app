# 🚀 LatinFun — Guida Completa al Deploy nelle Store

**Data**: Aprile 2026
**Bundle ID**: `it.latinfun.app`
**Project Owner Expo**: `maurocatalini`

---

## ✅ PRE-FLIGHT CHECKLIST

Prima di iniziare il deploy, assicurati di avere:

### Account & Pagamenti
- [x] Apple Developer Account ($99/anno) — già pagato ✓
- [x] Google Play Console ($25 una tantum) — già pagato ✓
- [ ] Account Expo (gratis) — registrati su https://expo.dev se non l'hai già

### Tool da installare in locale (Mac per iOS, qualsiasi OS per Android)
```bash
npm install -g eas-cli
eas login   # accedi con account Expo
```

### Asset già pronti nel progetto
- [x] **Icona app** (`/app/frontend/assets/images/icon.png`) — 1024x1024 brandizzata LatinFun ✓
- [x] **Adaptive icon Android** (`adaptive-icon.png`) ✓
- [x] **Splash screen** (`splash-image.png`) ✓
- [x] **app.json** con bundle ID, permessi, plugins configurati ✓
- [x] **eas.json** con profili dev/preview/production ✓
- [x] **Privacy Policy** (`/app/store/PRIVACY_POLICY.md`) — DA pubblicare online
- [x] **Terms of Service** (`/app/store/TERMS_OF_SERVICE.md`) — DA pubblicare online
- [x] **App Store Listing** (`/app/store/APP_STORE_LISTING.md`) — testi pronti
- [x] **Screenshot preview** in `/app/store/screenshots/` (riferimento, dovrai rifarli da iPhone reale per qualità store)

---

## 📋 STEP 1 — Pubblicare Privacy Policy & Terms (5-15 min)

Apple e Google richiedono URL pubblici per privacy policy. Opzioni:

### Opzione A — GitHub Pages (gratis, 5 min)
1. Crea un repo pubblico su GitHub: `latinfun-legal`
2. Carica `PRIVACY_POLICY.md` e `TERMS_OF_SERVICE.md`
3. Settings → Pages → Source: `main` branch → Save
4. Avrai URL tipo: `https://tuonome.github.io/latinfun-legal/PRIVACY_POLICY.html`

### Opzione B — Convertili in HTML statico
1. Convertili in HTML (ci sono mille convertitori online md→html)
2. Caricali su qualsiasi web hosting (anche gratis: Netlify, Vercel, Cloudflare Pages)
3. Imposta URL personalizzato (es. `https://latinfun.it/privacy`)

📌 **Dovrai inserire entrambi gli URL nelle store** in fase di submit.

---

## 🛠️ STEP 2 — Build Production con EAS (1-2 ore)

```bash
cd /percorso/al/progetto/frontend
eas login   # se non già fatto
```

### Build iOS
```bash
eas build --platform ios --profile production
```

EAS ti chiederà:
1. **Apple ID** — la tua email Apple Developer
2. **App-specific password** o sign-in completo
3. **Distribution certificate**: lascia che EAS lo crei in automatico (consigliato)
4. **Provisioning profile**: idem, automatico

⏱️ Build dura ~20-30 minuti sui server EAS. Riceverai email quando finito.

📥 Output: file `.ipa` scaricabile dalla pagina build su expo.dev

### Build Android
```bash
eas build --platform android --profile production
```

EAS ti chiederà:
1. Generazione automatica keystore: **ACCETTA** (Expo lo conserva forever, serve per gli aggiornamenti)
2. Nient'altro

⏱️ Build dura ~15-25 minuti.

📥 Output: file `.aab` scaricabile.

---

## 📤 STEP 3 — Submit alle Store (30-60 min ciascuna)

### Submit iOS

#### Prerequisito: App Store Connect API Key (5 min)
1. Vai su https://appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API
2. Genera una chiave (Access: "App Manager")
3. Scarica il file `.p8`
4. Salva: **Issuer ID**, **Key ID**, **percorso del file .p8**

#### Crea l'app su App Store Connect
1. https://appstoreconnect.apple.com → My Apps → "+"
2. Compila:
   - **Platform**: iOS
   - **Name**: LatinFun
   - **Primary Language**: Italian
   - **Bundle ID**: `it.latinfun.app`
   - **SKU**: `latinfun-ios-001`
3. Salva. Annota l'**App Store Connect App ID** (numero che vedi nell'URL).

#### Aggiorna `eas.json` con i tuoi dati
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "TUA-EMAIL@apple.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDEF1234"
    }
  }
}
```
(Apple Team ID lo trovi su https://developer.apple.com/account → Membership)

#### Submit
```bash
eas submit --platform ios --latest
```

⏱️ Upload dura ~5 minuti. Poi va in TestFlight automaticamente.

### Submit Android

#### Prerequisito: Service Account JSON (10 min)
1. Play Console → Setup → API access
2. Crea Google Service Account → scarica JSON
3. Dai permessi "Release manager" all'account
4. Salva file su disco (NON in git!)

#### Crea l'app su Play Console
1. https://play.google.com/console → Crea app
2. Compila nome, lingua, app/gioco, gratuita
3. Vai su Monetization > Apps & games disclosure → compila
4. Cards di setup richieste: Privacy Policy, App access, Ads, Content rating, Target audience, News apps, COVID-19 apps, Data safety

#### Aggiorna `eas.json`
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "/percorso/assoluto/service-account.json",
      "track": "internal"
    }
  }
}
```

#### Submit
```bash
eas submit --platform android --latest
```

⏱️ Upload ~3 minuti. Va su track "internal" inizialmente (test interno).

---

## 📱 STEP 4 — Compila le schede prodotto

### App Store Connect (~30-60 min)

In App Store Connect → My Apps → LatinFun → 1.0 Prepare for Submission:

#### Section: App Information
- **Subtitle** (max 30 char): _"La scena Latin in Italia"_
- **Privacy Policy URL**: il tuo URL pubblicato
- **Category**: Primary = Music, Secondary = Lifestyle

#### Section: Pricing and Availability
- Price: Free
- Availability: Italy (all'inizio), poi puoi espandere

#### Section: App Privacy
Compila il questionario "Data Collection". Per LatinFun:
- ☑ Email (per comunicazioni utente)
- ☑ Name (per profilo utente)
- ☑ Coarse location (per eventi vicini)
- ☑ Photos (per foto profilo / scuole)
- ☑ User content (chat tra match)
- ☑ Identifiers (Stripe payments)

#### Section: Version Information

**Description** (max 4000 char) — usa testo da `/app/store/APP_STORE_LISTING.md`:
> LatinFun è il punto di riferimento per la scena Latin in Italia. Trova eventi vicino a te, scopri DJ e scuole di ballo, ascolta playlist sempre fresche, trova il tuo partner di ballo perfetto.
> 
> 🎉 **EVENTI** — Mappa interattiva con filtri città/genere
> 🎧 **DJ** — Profili verificati con bio e set
> 💃 **SCUOLE** — Trova la academia più adatta a te
> 🎵 **MUSICA** — Playlist Bachata, Salsa, Reggaeton aggiornate ogni settimana
> 💕 **MATCH PARTNER** — Trova il ballerino perfetto e chatta in app
> 
> Per organizzatori e DJ: promuovi il tuo evento con BOOST.
> Per scuole: ricevi richieste qualificate dagli studenti.

**Keywords** (100 char totali):
```
bachata,salsa,reggaeton,latino,kizomba,merengue,ballo,latin,milano,roma
```

**Promotional Text** (170 char): _"La community Latin in Italia: eventi, DJ, scuole e match partner di ballo, tutto in un'unica app."_

**Support URL**: il tuo URL contatti
**Marketing URL**: il sito web (opzionale)

#### Section: App Review Information
- **Sign-in required**: Yes
- **Demo account**:
  - **Username**: `admin@latinfun.it`
  - **Password**: `admin123`
- **Notes for reviewer**:
  > "Use admin credentials to test all features including BOOST, lead unlock, sponsor management, and admin dashboards. Stripe is in test mode for review."
- **Contact info**: nome, telefono, email

#### Section: Screenshots
Devi caricare almeno 1-3 screenshot per ogni dimensione richiesta:
- **iPhone 6.7"** (1290x2796) — RICHIESTO
- **iPhone 6.5"** (1242x2688) — opzionale ma consigliato
- **iPad 12.9"** (2048x2732) — solo se supporti iPad

📸 **Come prenderli (PROFESSIONALI)**:
1. Sul tuo iPhone, apri Safari e vai a `https://dj-italia-hub.preview.emergentagent.com`
2. Login admin
3. Per ogni schermata che vuoi screenshare:
   - Usa le funzioni nativa di iPhone (volume up + power)
   - Le dimensioni saranno automaticamente corrette per il tuo modello
4. Schermate raccomandate (in ordine):
   1. Home con banner LATINFUN
   2. Lista eventi con cards colorate
   3. Pagina dettaglio evento con BOOST
   4. Match Partner di Ballo (Discover)
   5. Pagina DJ con profilo
   6. Music con playlist
   7. Programma Affiliati con codice
   8. Profilo

💡 **Tip pro**: aggiungi caption sopra le immagini con app come [Screenshots Pro](https://apps.apple.com/app/screenshots-pro/id1468917279) per look più professionale.

### Google Play Console (~30 min)

In Play Console → tua app → Main store listing:

- **Short description** (80 char): _"La scena Latin in Italia: eventi, DJ, scuole, match e playlist."_
- **Full description** (4000 char): copia da `APP_STORE_LISTING.md`

#### Graphics
- **App icon**: 512x512 (carica `icon.png` ridimensionata)
- **Feature graphic**: 1024x500 — banner promo (PUOI USARE IL BANNER da `logoKit.ts`!)
- **Phone screenshots**: min 2, max 8, dimensioni 1080x1920+ (useremo gli stessi presi da iPhone, vanno bene su Android)

#### Content rating
Compila il questionario (3-5 min). Per LatinFun:
- Categoria: Music
- Violenza: No
- Sex: No (anche se c'è "Match Partner", non è dating sessuale)
- Language: No profanità
- Controlled substances: No
- Gambling: No
- User-generated content: Yes (chat, recensioni) — devi avere policy moderazione
- Output: probabilmente PEGI 12 / Teen

#### Data safety
Simile a iOS Privacy questionnaire. Dichiara:
- Email collected, encrypted in transit, can be deleted
- Photos collected (per profilo), encrypted in transit
- Location collected (coarse), encrypted in transit
- Financial info: NO (gestito da Stripe, fuori dall'app)

#### Pricing & distribution
- Free
- Italy initially, expand later
- Contains ads: NO (sponsor banner non sono ad networks)
- In-app purchases: YES (BOOST + Lead unlock via Stripe)

---

## ⏱️ STEP 5 — Aspetta la Review

| Store | Tempo medio review | Tempo max |
|---|---|---|
| **Apple** | 24-48 ore | 7 giorni |
| **Google** | 2-12 ore (prima volta 1-3 giorni) | 7 giorni |

**Tracking**:
- Apple: notifiche email + App Store Connect
- Google: Play Console homepage

---

## 🚨 STEP 6 — Rejection Comuni & Soluzioni

### Apple Rejection #1 — "Stripe payments without IAP"
Apple richiede in-app purchase del 30% per **beni digitali**. Poiché LatinFun vende:
- BOOST (visibilità promozionale per evento reale) ✅ OK con Stripe
- Lead unlock (contatto utente reale) ✅ OK con Stripe

**Soluzione**: nella nota review scrivi:
> "BOOST and Lead Unlock are not digital goods. They are services for promoting real-world events and exchanging contact information for real-world dance lessons. As per App Store Review Guidelines 3.1.5(a), physical goods and services for use outside of the app are exempt from in-app purchase requirement."

### Apple Rejection #2 — "Demo account doesn't work"
Verifica che `admin@latinfun.it` / `admin123` funzioni dal **build di production** (non dal preview!). Dopo il deploy del backend, testa.

### Google Rejection #1 — "Privacy policy missing"
Assicurati che l'URL privacy policy sia attivo PUBBLICAMENTE prima di inviare.

### Google Rejection #2 — "Permission unjustified"
Per ogni permesso (location, camera) deve esserci una giustificazione chiara nel Data Safety form.

---

## 🌐 STEP 7 (CRITICO) — Backend di Produzione

⚠️ **ATTENZIONE**: Attualmente l'app punta a `https://dj-italia-hub.preview.emergentagent.com` che è il preview Emergent. Per la produzione devi avere un backend stabile e permanente.

### Opzioni per hosting backend FastAPI + MongoDB

| Provider | Costo mensile | Facilità | Note |
|---|---|---|---|
| **Railway** | $5-20 | ⭐⭐⭐⭐⭐ | Deploy in 5 min, MongoDB add-on |
| **Render** | $7-25 | ⭐⭐⭐⭐⭐ | Free tier limitato |
| **Fly.io** | $5-15 | ⭐⭐⭐⭐ | Più tecnico ma scalabile |
| **DigitalOcean App** | $12-25 | ⭐⭐⭐⭐ | Stabile, MongoDB Atlas a parte |
| **Vercel + MongoDB Atlas** | $10-30 | ⭐⭐⭐ | Vercel + DB separato |

### Setup veloce con Railway (consigliato per MVP):
1. Vai su https://railway.app → New Project → Deploy from GitHub
2. Connetti repo backend
3. Aggiungi variabili env:
   - `MONGO_URL` (Railway ha MongoDB add-on)
   - `STRIPE_API_KEY`
   - `JWT_SECRET`
4. Deploy automatico al push
5. Aggiorna `eas.json` con il nuovo URL: `EXPO_PUBLIC_BACKEND_URL=https://tuobackend.railway.app`
6. Rebuild app

⏱️ Tempo: 30-60 min

---

## 🎯 TIMELINE COMPLETA REALISTICA

| Step | Tempo |
|---|---|
| Privacy/Terms hosting | 15 min |
| Backend production deploy | 30-60 min |
| Build EAS iOS + Android | 1 ora (parallelo) |
| Setup ASC + Play Console + API keys | 30 min |
| Submit eas submit | 15 min |
| Compilazione schede prodotto | 60 min |
| Screenshot iPhone professionali | 30 min |
| **Lavoro tuo: 3-4 ore** | |
| Apple review attesa | 24-72 ore |
| Google review attesa | 2-24 ore |
| **Totale dalla prima riga al live** | **3-7 giorni** |

---

## 🆘 SUPPORT

Se qualcosa non funziona:
- **EAS issues**: https://expo.dev/eas → Build logs
- **Apple rejection**: ti scrivono email con motivo specifico, rispondi via Resolution Center
- **Google rejection**: idem, via Play Console messaging
- **Backend down dopo deploy**: controlla logs su Railway/Render dashboard

---

## 📞 CONTATTI DEMO PER REVIEWER

Quando Apple/Google ti chiede credenziali test:
- **Email**: `admin@latinfun.it`
- **Password**: `admin123`

---

## ✅ POST-LANCIO

Una volta live:
1. Configura **EAS Updates** per push OTA (aggiornamenti senza review)
2. Imposta monitoring (Sentry su Expo)
3. Crea pagina landing: `https://latinfun.it`
4. Marketing: Instagram, TikTok, partnership scuole/DJ
5. Track metrics su Mixpanel o Amplitude
6. Aggiorna app ogni 2-4 settimane con bug fix e nuove feature

🎉 **In bocca al lupo per il lancio!**

---

_Documento generato Aprile 2026 — versione 2.0_
