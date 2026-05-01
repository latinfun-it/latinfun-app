#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "LatinFun v1.1: aggiungere pulsante 'Aggiungi evento' nel tab Eventi; rifare il form Crea Evento con tipo organizzatore (DJ/Gestore locale/Promoter/Festival/Scuola di ballo/Privato), generi a testo libero separati da virgola, orario Dalle/Alle separati, upload locandina con auto-resize quadrato 1080x1080 (formato post Instagram), autocomplete dei locali frequenti dell'utente. Profilo ballerino: dopo creazione mostrare scheda profilo (non più redirect a swipe), aggiungere pulsante back per tornare alla home, ridurre qualità foto profilo. Auth interceptor: redirect automatico al login su 401 invece di spinner infinito."

backend:
  - task: "Event model + EventCreate aggiornati con organizer_type, end_date"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Aggiunti campi organizer_type (str opzionale: dj|gestore_locale|promoter|festival|scuola_ballo|privato) e end_date (datetime opzionale) al modello Event e EventCreate. Da testare creazione evento con questi nuovi campi."
      - working: true
        agent: "testing"
        comment: "PASS: POST /api/events con organizer_type='dj' + end_date='2026-08-16T04:00:00' ritorna 200 con campi corretti nel body. GET /api/events/{id} persiste entrambi i campi. POST senza organizer_type/end_date funziona e ritorna None per entrambi. Anche eventi legacy (11/11 nel DB attuale) ritornano organizer_type/end_date come null senza errori."

  - task: "POST /api/events con anti-flood (max 3 eventi/giorno per utente non-admin)"
    implemented: true
    working: false
    file: "/app/backend/server.py"
    stuck_count: 1
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Aggiunto rate limit 3 eventi/24h per utente standard. Admin esente. Salva created_at_ts nel doc per query rate limit. Da testare: 1) admin può creare 4+ eventi senza limite, 2) utente non-admin riceve 429 al 4° evento, 3) il messaggio italiano 'Hai raggiunto il limite di 3 eventi al giorno' viene restituito."
      - working: false
        agent: "testing"
        comment: "BUG CRITICO: il check di esenzione admin usa `current_user.get('is_admin')` (server.py:676) ma nel documento utente NON esiste il campo 'is_admin' — il ruolo viene salvato come 'role': 'admin'. Risultato: anche l'admin viene rate-limited. Test: l'admin nel mio test si ferma dopo 3 eventi su 5 e riceve 429 al 4° tentativo. La parte non-admin funziona correttamente (3 eventi OK, 4° ritorna 429 con messaggio italiano corretto). FIX: cambiare `if not current_user.get('is_admin'):` in `if current_user.get('role') != 'admin':` (line 676). Ulteriore conseguenza: questo bug blocca anche la creazione del 4° evento amministrativo nel test del task 3 (vedi sotto)."

  - task: "GET /api/events/my/venues - locali frequenti dell'utente per autocomplete"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Nuovo endpoint protetto. Aggrega gli eventi dell'utente (owner_id=me) raggruppando per (venue, city, address) ordinato per count desc + last_used desc, max 10 risultati. Da testare con utente con 0/1/N eventi."
      - working: true
        agent: "testing"
        comment: "PASS funzionalità endpoint: ritorna lista di {venue, city, address, count} per i locali dell'utente, ordinata per count desc, max 10. GET unauthenticated -> 401 corretto. Test ha creato 3 eventi 'Habana Cafe Roma' + 1 'Tropicana Milano' come admin: 'Habana count=3' presente correttamente, ma 'Tropicana' non è apparso perché il 4° evento (Tropicana) ha colpito il rate-limit dovuto al BUG admin esenzione (vedi task anti-flood). Quando il bug `is_admin` sarà fixato, il test del 4° venue passerà automaticamente. L'endpoint stesso è corretto."

frontend:
  - task: "Form Crea Evento (event/create.tsx) - rifatto"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/event/create.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Riscritto completamente. Nuovi campi: tipo organizzatore (chips), generi testo libero, date picker per data + 2 time picker per Dalle/Alle, upload locandina (ImagePicker con allowsEditing+aspect 1:1+quality 0.6), autocomplete locali frequenti via /events/my/venues. Backend: invia organizer_type, end_date computato. Non testato in UI, solo backend deve essere verificato."

  - task: "Pulsante '+ Aggiungi' nel tab Eventi"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/events.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Aggiunto pulsante 'Aggiungi' (sfondo brand) accanto al titolo Eventi che naviga a /event/create. testID: events-add-btn."

  - task: "Profilo ballerino: vista scheda profilo + back button"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/dancer.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Riscritto dancer.tsx con 3 stati: nessun profilo (CTA crea), profilo creato vista (default, mostra scheda con foto+stili+bio+ig + pulsanti Modifica/Scopri/Match), modalita swipe (cliccando 'Scopri ballerini'). Aggiunto back button verso home in tutti gli stati."

  - task: "Auth interceptor 401 -> logout automatico"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/api.ts, /app/frontend/src/auth.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Aggiunto axios response interceptor che intercetta 401 (escluso /auth/login e /auth/register), pulisce TOKEN_KEY da AsyncStorage e chiama tokenExpiredHandler. AuthProvider registra l'handler e setta user=null cosi viene reindirizzato a /login automaticamente."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Event model + EventCreate aggiornati con organizer_type, end_date"
    - "POST /api/events con anti-flood (max 3 eventi/giorno per utente non-admin)"
    - "GET /api/events/my/venues - locali frequenti dell'utente per autocomplete"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "LatinFun v1.1: aggiunti nuovi campi backend (organizer_type, end_date) + anti-flood eventi + endpoint /events/my/venues. Da testare backend con admin@latinfun.it/admin123. Verificare: (1) Admin POST /api/events con organizer_type='dj' e end_date funziona; (2) Admin POST /api/events senza end_date (deve essere None opzionale) funziona; (3) Anti-flood: utente normale puo creare 3 eventi al giorno ma il 4o riceve 429 con messaggio italiano; (4) Admin esente da rate limit; (5) GET /api/events/my/venues restituisce locali frequenti raggruppati con count. Frontend gia testato manualmente dall'utente, backend va verificato."
  - agent: "testing"
    message: "Risultati test backend v1.1 (18/20 PASS, 1 BUG critico): TASK 1 (Event model con organizer_type+end_date) — TUTTO OK. POST/GET con e senza i nuovi campi funzionano correttamente, eventi legacy (11 nel DB) tornano con null senza errori. TASK 2 (anti-flood) — PARZIALE: il rate-limit per non-admin funziona perfettamente (3 eventi 200 OK, 4° -> 429 con messaggio 'Hai raggiunto il limite di 3 eventi al giorno. Riprova domani.'). PERO' BUG CRITICO: anche l'admin viene rate-limited. Causa root: server.py riga 676 usa `current_user.get('is_admin')`, ma il documento utente ha invece il campo `role: 'admin'` (vedi User model). Il check va cambiato in `if current_user.get('role') != 'admin':` come già fatto in tutti gli altri endpoint (es. _require_admin a riga 370). FIX SUGGERITO (1 riga in server.py:676): `if current_user.get('role') != 'admin':`. TASK 3 (/events/my/venues) — endpoint OK: ritorna lista {venue,city,address,count} ordinata per count desc, max 10, 401 se non autenticato. Habana count=3 corretto. Il test ha visto solo 1 entry invece di 2 per effetto a cascata del bug admin (il 4° insert come admin ha colpito il 429). Una volta fixato il bug `is_admin`, anche questo test sarà completo. TASK 4 (regression) — OK: GET /api/events ritorna 200, eventi legacy serializzano correttamente con organizer_type=None/end_date=None. Cleanup: tutti gli eventi creati in test sono stati cancellati con DELETE /api/events/{id}."
