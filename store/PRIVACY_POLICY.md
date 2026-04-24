# Privacy Policy — LatinHub

**Ultimo aggiornamento**: [INSERIRE DATA DI PUBBLICAZIONE]

## 1. Titolare del trattamento
LatinHub è gestita da **[Nome ragione sociale / tua P.IVA]**
Email: info@latinhub.it
PEC: [se presente]
Sede: [Città, Italia]

Per qualsiasi richiesta relativa alla privacy puoi contattarci a **privacy@latinhub.it**.

## 2. Dati raccolti

### 2.1 Dati forniti dall'utente al momento della registrazione
- Nome e cognome
- Indirizzo email
- Password (hashata con bcrypt, mai in chiaro)

### 2.2 Dati raccolti automaticamente
- **Indirizzo IP** (per sicurezza e anti-abuso)
- **Token di autenticazione** (JWT, conservato in locale sul dispositivo)
- **Posizione geografica approssimata** (solo se concedi il permesso, usata per mostrarti eventi vicini e inviare notifiche push geolocalizzate)
- **Token push** Expo (se attivi le notifiche)
- **Log di accesso** (data, ora, user agent) per statistiche aggregate

### 2.3 Contenuti creati dall'utente
- Profili DJ / scuole di ballo (bio, foto, link social, playlist)
- Eventi creati (titolo, descrizione, data, luogo, immagini)
- Like su eventi, follow su DJ
- Messaggi di contatto inviati agli organizzatori di eventi

### 2.4 Dati di pagamento
**Non raccogliamo mai dati di pagamento sui nostri server.** I pagamenti per i pacchetti BOOST sono gestiti interamente da **Stripe Inc.**, un processore di pagamento certificato PCI-DSS Level 1. Ci viene comunicato solo:
- Stato del pagamento (riuscito / fallito)
- Identificativo sessione Stripe
- Importo e pacchetto acquistato

Per la privacy policy di Stripe: https://stripe.com/it/privacy

## 3. Finalità del trattamento

| Finalità | Base giuridica | Dati utilizzati |
|---|---|---|
| Erogazione del servizio | Esecuzione contratto (art. 6.1.b GDPR) | Email, password, nome, contenuti creati |
| Notifiche push geolocalizzate | Consenso (art. 6.1.a GDPR) | Posizione, push token |
| Sicurezza e prevenzione frodi | Legittimo interesse (art. 6.1.f GDPR) | IP, log accesso |
| Elaborazione pagamenti BOOST | Esecuzione contratto | Dati Stripe session |
| Comunicazioni di servizio | Esecuzione contratto | Email |
| Analisi aggregate | Legittimo interesse | Dati anonimizzati |

## 4. Conservazione dei dati
- **Account attivi**: fin quando l'account esiste
- **Dati dopo cancellazione account**: eliminati entro 30 giorni (eccetto obblighi fiscali/contabili dove richiesto dalla legge, max 10 anni per le ricevute Stripe)
- **Log di accesso**: 12 mesi
- **Token push scaduti**: eliminati automaticamente

## 5. Condivisione dei dati
**Non vendiamo mai i tuoi dati.** Li condividiamo solo con:

| Servizio | Scopo | Dati condivisi | Paese |
|---|---|---|---|
| Stripe Inc. | Pagamenti BOOST | Email, importo | USA (clausole GDPR) |
| Expo Push Service | Invio notifiche | Push token, messaggio | USA (clausole GDPR) |
| MongoDB Atlas / Hosting | Database e hosting | Tutti i dati utente | UE |
| Servizi email (se attivati) | Invio email transazionali | Email, nome | UE |

## 6. Diritti dell'utente (GDPR)
In qualsiasi momento puoi:
- ✅ **Accedere** ai tuoi dati (scrivici a privacy@latinhub.it)
- ✅ **Rettificare** dati inesatti (dalla sezione Profilo in app)
- ✅ **Cancellare** il tuo account (dalla sezione Impostazioni → Elimina account)
- ✅ **Opporti** al trattamento
- ✅ **Portabilità** dei dati (export JSON su richiesta)
- ✅ **Limitare** il trattamento
- ✅ **Revocare** il consenso alle notifiche (dalla sezione Notifiche)

Per esercitare questi diritti scrivici a **privacy@latinhub.it**. Ti risponderemo entro 30 giorni.

Puoi inoltre presentare reclamo al **Garante per la protezione dei dati personali** (www.garanteprivacy.it).

## 7. Cookie e tecnologie simili
L'app mobile **non usa cookie**. L'unica informazione conservata in locale sul tuo dispositivo è il token JWT di autenticazione, cancellato al logout. La versione web può usare cookie tecnici essenziali al funzionamento (anche questi non tracciano).

## 8. Minori
LatinHub non è destinata a minori di 14 anni. Se scopriamo di aver raccolto dati da un minore di 14 anni senza il consenso dei genitori, li elimineremo immediatamente.

## 9. Sicurezza
- Password hashate con bcrypt
- Comunicazioni tramite HTTPS/TLS 1.3
- Token di autenticazione a scadenza
- Accesso ai dati limitato al personale autorizzato
- Backup cifrati del database

## 10. Trasferimenti extra-UE
Alcuni fornitori (Stripe, Expo) hanno sede negli USA. Utilizziamo le **Clausole Contrattuali Standard (SCC)** della Commissione Europea per garantire adeguata protezione ai sensi dell'art. 46 GDPR.

## 11. Modifiche alla privacy policy
Pubblicheremo eventuali modifiche in questa pagina con la nuova data di aggiornamento. Per modifiche sostanziali ti avviseremo anche tramite email o notifica in-app.

---

**Hai domande?** Contattaci a **privacy@latinhub.it**
