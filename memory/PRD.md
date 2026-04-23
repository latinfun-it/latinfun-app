# LatinHub - Product Requirements Document

## Vision
LatinHub e IL punto di riferimento per la scena della musica latina in Italia:
eventi, DJ, mega mix e playlist - tutto in un'unica app mobile.

## Target
- Appassionati di bachata, salsa e reggaeton in Italia
- DJ e promoter che vogliono visibilita nella scena latina
- Locali / organizzatori di serate latine

## MVP Features (delivered)
1. **Autenticazione Email/Password** (JWT Bearer, AsyncStorage)
2. **Mappa / Lista Eventi** con filtri citta + genere + **search bar full-text** (citta, evento, DJ, venue) e **geolocalizzazione automatica** per pre-filtrare la citta dell'utente (expo-location)
3. **Profili DJ/Artisti** con bio, social, "Verified by Mauro Catalini" badge, embed playlist Spotify reale (di Mauro) e link Tidal
4. **Creazione Eventi** (endpoint POST autenticato pronto)
5. **Radio / Mega Mix Player** (expo-audio) con floating mini-player persistente tra le schermate, progress bar, auto-background play
6. **Spotify & Tidal Playlist Embed** su profilo DJ (WebView Spotify su mobile, deep-link Tidal)
7. **Scuole di ballo** - tab dedicato: lista + dettaglio + **form auto-registrazione per maestri** (POST /schools autenticato) con stili, livelli, contatti completi (telefono, email, sito, Instagram, indirizzo con deep-link Google Maps)
8. **Profilo utente** con badge ruolo, link rapido "Registra la tua scuola", statistiche e logout

## Tech Stack
- **Backend**: FastAPI + Motor (MongoDB async), bcrypt, PyJWT (HS256, 7d), Pydantic v2
- **Frontend**: Expo SDK 54, expo-router file-based, expo-audio, expo-linear-gradient, react-native-webview, axios, @react-native-async-storage/async-storage, @expo/vector-icons
- **Design system**: Theme "Jewel & Luxury" (Obsidian #050505 + Electric Crimson #E11D48 + Gold #F59E0B), fonts system bold
- **Auth storage**: AsyncStorage (mobile Bearer tokens)

## Seed Data (automatic on startup)
- 1 admin user (Mauro Catalini)
- 6 DJs (Milano, Roma, Napoli, Bologna, Torino, Firenze) - 4 Verified by Mauro
- 9 eventi in 7 citta italiane, alcuni featured e boosted
- 5 mega mix (bachata, reggaeton, salsa, latin)

## API (all under /api)
- Auth: POST /auth/register, /auth/login, /auth/logout, GET /auth/me
- Events: GET /events [?city&genre&featured], GET /events/{id}, POST /events (auth)
- DJs: GET /djs [?city&verified], GET /djs/{id}
- Mixes: GET /mixes [?genre], GET /mixes/{id} (increments plays)
- **Schools: GET /schools [?city&style], GET /schools/{id}, POST /schools (auth), GET /my/school (auth)**
- Meta: GET /cities

## Business Model (Phase 2)
1. **Promozione Eventi**: organizzatori pagano per BOOST visibility (already has `boosted` flag in schema)
2. **Abbonamento DJ Premium**: profilo verified + analytics
3. **Sponsorship**: brand alcolici / club / festival

## Roadmap (post-MVP)
- Notifiche smart geo-based ("Mauro Catalini suona stasera vicino a te")
- Mappa interattiva eventi con Mapbox/Google Maps
- Ranking DJ italiani (likes, follows, plays)
- Creazione/gestione eventi direttamente dall'app (frontend form)
- Stripe per BOOST pagato e abbonamenti DJ Premium
- Upload video/reels per profili DJ
- Networking DJ <-> promoter (DM/chat)

## Mocked / Placeholder
- **Radio audio_url** = SoundHelix sample mp3 (segnaposto, sostituire con CDN reale)
- **Spotify/Tidal playlist URLs** = placeholder generici (sostituire con playlist reali di Mauro Catalini e DJ registrati)

## Launch Hook (smart business lever)
"Verified by Mauro Catalini" badge crea autorita e scarsita:
Mauro appone il sigillo solo ai DJ e agli eventi che approva personalmente.
Questo trasforma l'app da semplice directory a filtro di qualita della scena,
incentivando DJ e organizzatori a volere la spunta -> pipeline naturale per
**abbonamento DJ Premium** pagato (upsell chiaro gia dal giorno 1).
