# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 46 (29 Marzo 2026) - COMPLETATA ✅

**Riorganizzazione Sezione Categorie Clienti**

**Richiesta Utente:** Le card categoria non devono mostrare la lista clienti direttamente. Devono essere cliccabili e aprire una vista dettaglio dedicata.

**Implementato:**
- ✅ Card categoria pulite con: icona, nome, descrizione, conteggio clienti
- ✅ Freccia che indica cliccabilità
- ✅ Hover effect con animazione
- ✅ Dialog modale per vista dettaglio categoria
- ✅ Header con icona, nome, descrizione e badge conteggio
- ✅ Barra di ricerca per filtrare clienti nella categoria
- ✅ Lista completa clienti con: avatar, nome, email, pulsante "Dettagli"
- ✅ Click su cliente naviga alla scheda cliente
- ✅ 5 categorie: Autonomi, Società, Privati, Vivienda Vacacional, Persona Fisica

**File Modificato:**
- `/app/frontend/src/pages/ClientLists.jsx`

### Fase 45 (28 Marzo 2026) - COMPLETATA ✅

**App Desktop Electron per Amministratore**

**Richiesta Utente:** Creare un'applicazione desktop installabile per Mac (con predisposizione Windows) che sia un wrapper stabile della piattaforma web esistente, destinata solo all'amministratore e al team interno.

**Implementato:**
- ✅ Progetto Electron completo in `/app/desktop-app/`
- ✅ Wrapper della web app `https://app.fiscaltaxcanarie.com`
- ✅ Sessione persistente (non richiede login ripetuto)
- ✅ Icona nella system tray con menu rapido
- ✅ Menu applicazione nativo (Mac style)
- ✅ Scorciatoie da tastiera (Cmd+1 Dashboard, Cmd+2 Clienti, etc.)
- ✅ Pagina offline con retry automatico
- ✅ Preferenze notifiche (attiva/disattiva)
- ✅ Navigazione rapida tra sezioni
- ✅ Build configurato per Mac (DMG) e Windows (NSIS)

**File Struttura:**
```
/app/desktop-app/
├── main.js              # Processo principale Electron
├── preload.js           # Bridge sicuro
├── offline.html         # Pagina offline
├── package.json         # Config + build
├── build/               # Icone (png, ico, icns)
└── README.md            # Istruzioni build
```

**Comandi Build:**
- `npm run build:mac` → DMG per macOS
- `npm run build:win` → EXE per Windows
- `npm run build:all` → Entrambi

**Note Distribuzione:**
- Versione test: non firmata (avviso sicurezza su Mac)
- Per distribuzione: richiede Apple Developer Certificate ($99/anno)

### Fase 44 (28 Marzo 2026) - COMPLETATA ✅

**Vista Cliente per Richieste di Documentazione**

**Richiesta Utente:** Permettere al cliente di rispondere alle richieste di documentazione dell'admin, caricare documenti e comunicare tramite conversazione interna.

**Frontend Implementato:**
- ✅ `/app/frontend/src/components/ClientIntegrationRequests.jsx` (NUOVO):
  - Alert giallo con conteggio richieste pendenti
  - Card per ogni richiesta con:
    - Badge sezione
    - Messaggio dell'admin
    - Lista documenti richiesti
    - Pulsante "Rispondi" → Dialog per risposta testuale
    - Pulsante "Carica Documento" → Upload file
  - Richieste completate in verde
  - Conversazione bidirezionale cliente ↔ admin

- ✅ `/app/frontend/src/components/TaxReturnForm.jsx` (modificato):
  - Nuova sezione "Richieste e Messaggi" (id: comunicazioni)
  - Tab con badge numerico (richieste + messaggi non letti)
  - Integrazione con ClientIntegrationRequests

**Backend Fix (da Testing Agent):**
- ✅ Corretto endpoint `respond`: da PUT+Form a POST+JSON per compatibilità con frontend

**Test:** Verificato al 100% con testing agent (iteration_25.json):
- Backend: 11/11 test passati
- Frontend: Tutte le funzionalità verificate via Playwright

**Credenziali Test Cliente:**
- Email: francesco@fiscaltaxcanarie.com
- Password: TestClient123!

### Fase 43 (28 Marzo 2026) - COMPLETATA ✅

**Ristrutturazione Sezione Dichiarazioni per Admin**

**Richiesta Utente:** Riorganizzare la sezione Dichiarazioni per essere centrata sul cliente, non sulla singola pratica. L'admin deve poter:
1. Vedere i clienti con dichiarazioni, non un elenco disordinato
2. Visualizzare tutti i dati inseriti dal cliente
3. Richiedere documentazione/chiarimenti (con email)
4. Avere una conversazione interna per ogni dichiarazione
5. Ricevere documenti aggiuntivi dal cliente dopo la richiesta

**Backend Implementato:**
- ✅ `GET /api/declarations/clients-with-declarations` - Lista clienti con riepilogo dichiarazioni:
  - Conteggi per stato (bozza, inviate, in_revisione, presentate, doc_incompleta)
  - Richieste pendenti totali
  - Messaggi non letti
  - Ultima attività
  - Filtri per ricerca, tipo_cliente, has_pending_requests
- ✅ `POST /api/declarations/tax-returns/{id}/messages` - Invio messaggi conversazione
- ✅ `PUT /api/declarations/tax-returns/{id}/messages/mark-read` - Segna messaggi come letti
- ✅ Campo `conversazione` aggiunto a TaxReturn model

**Frontend Implementato:**
- ✅ `/app/frontend/src/components/AdminDeclarationsView.jsx` (NUOVO):
  - 4 stats cards: Clienti, Dichiarazioni, Richieste Pendenti, Messaggi Non Letti
  - Filtri: ricerca, tipo cliente, con richieste pendenti
  - Lista clienti con conteggio dichiarazioni e indicatori alert
  - Click su cliente → mostra sue dichiarazioni
  - Click su dichiarazione → apre dettaglio

- ✅ `/app/frontend/src/components/DeclarationDetailView.jsx` (NUOVO):
  - Header con info cliente e dropdown cambio stato
  - 4 Tab:
    1. **Panoramica**: Info pratica, autorizzazione, sezioni compilate, richieste pendenti
    2. **Dati Inseriti**: Tutte le 12 sezioni con dati formattati
    3. **Documenti**: Lista documenti caricati
    4. **Comunicazioni**: Chat bidirezionale admin ↔ cliente
  - Pulsante "Richiedi Documentazione/Chiarimenti" → dialog con selezione sezione, messaggio, documenti richiesti
  - Email automatica al cliente per richieste e messaggi

**Modelli Aggiunti:**
- `DeclarationMessageCreate`, `DeclarationMessage` - Messaggi conversazione
- `ClientDeclarationSummary` - Riepilogo cliente

**Test:** Verificato al 100% con testing agent (iteration_24.json):
- Backend: 11/11 test passati
- Frontend: Tutte le funzionalità verificate

### Fase 42 (28 Marzo 2026) - COMPLETATA ✅

**Refactoring Backend - Rimozione Codice Duplicato**

**Lavoro Completato:**
- ✅ Rimosso blocco TICKET ROUTES duplicato da `server.py` (righe 2179-2508, 330 righe)
- ✅ Rimosso blocco FEES ROUTES duplicato da `server.py` (righe 3810-4183, 374 righe)
- ✅ Rimosso blocco TICKET MODELS duplicato (30 righe)
- ✅ Rimosso blocco FEE MODELS duplicato (36 righe)
- ✅ **Totale: 774 righe rimosse** (da 6019 a 5245 righe)

**Router Modulari Funzionanti:**
- `/app/backend/routes/tickets.py` - Tutte le API tickets operative
- `/app/backend/routes/fees_routes.py` - Tutte le API fees operative
- `/app/backend/routes/declarations.py` - API dichiarazioni fiscali

**Test:** Verificato al 100% con testing agent (iteration_23.json):
- Backend: 19/21 test passati (2 endpoint non implementati: activity-log, dashboard/stats)
- Frontend: 100% funzionante

### Fase 41 (28 Marzo 2026) - COMPLETATA ✅

**Nuova Sezione "Dichiarazioni" - Fase 1**

**Richiesta Utente:** Creare sistema completo per gestione dichiarazione dei redditi con:
- Form multi-step condizionale (14 sezioni)
- Firma grafometrica obbligatoria
- Generazione PDF autorizzazione
- Dashboard admin con filtri avanzati
- Struttura modulare per aggiungere altri tipi di dichiarazione (720, Società, etc.)

**Backend Implementato:**
- ✅ `/app/backend/routes/declaration_models.py` - Modelli Pydantic completi:
  - `DeclarationTypeCreate/Response` - Tipi dichiarazione configurabili
  - `TaxReturnPersonalData`, `TaxReturnFamilyData`, `TaxReturnEmploymentIncome`
  - `TaxReturnSelfEmployment`, `TaxReturnProperties`, `TaxReturnRentals`
  - `TaxReturnInvestments`, `TaxReturnCrypto`, `TaxReturnCapitalGains`
  - `TaxReturnDeductions`, `TaxReturnCanaryDeductions`
  - `TaxReturnAuthorization` - Firma e consenso
  - `TaxReturnDocument`, `TaxReturnClientNote`, `TaxReturnAdminNote`
  - `TaxReturnIntegrationRequest` - Richieste integrazione documentale

- ✅ `/app/backend/routes/declarations.py` - API complete:
  - `GET/POST /api/declarations/types` - CRUD tipi dichiarazione
  - `GET/POST /api/declarations/tax-returns` - CRUD pratiche
  - `PUT /api/declarations/tax-returns/{id}/sections/{section}` - Aggiorna sezione
  - `PUT /api/declarations/tax-returns/{id}/status` - Cambia stato
  - `POST /api/declarations/tax-returns/{id}/sign` - Firma autorizzazione
  - `GET /api/declarations/tax-returns/{id}/authorization-pdf` - Scarica PDF
  - `POST /api/declarations/tax-returns/{id}/documents` - Upload documenti
  - `POST /api/declarations/tax-returns/{id}/integration-requests` - Richieste integrazione
  - Notifiche email Brevo per invio pratica e richieste integrazione

**Frontend Implementato:**
- ✅ `/app/frontend/src/pages/DeclarationsPage.jsx`:
  - Pagina dedicata Dichiarazioni (sia admin che cliente)
  - Lista tipi dichiarazione con card selezionabili
  - Stats cards (Totale, In Bozza, Inviate, In Revisione, Presentate)
  - Filtri per anno, stato, ricerca cliente
  - Lista pratiche con badge stato e indicatori sezioni

- ✅ `/app/frontend/src/components/TaxReturnForm.jsx`:
  - Form multi-step con navigazione
  - Sezioni condizionali (visibili solo se abilitate)
  - Sezioni implementate: Filtro, Dati Personali, Situazione Familiare, Redditi Lavoro, Autonomo, Immobili
  - Componente firma grafometrica (react-signature-canvas)
  - Checkbox consenso obbligatoria
  - Validazione firma prima dell'invio

- ✅ Routes in App.js:
  - `/admin/declarations` - Dashboard admin
  - `/declarations` - Dashboard cliente

- ✅ Navigazione:
  - Card "Dichiarazioni" in CommercialDashboard
  - Pulsante "Dichiarazioni" in ClientDashboard welcome banner

**Librerie Installate:**
- `react-signature-canvas` - Firma grafometrica touch/mouse

**Stati Pratica:**
1. `bozza` - In compilazione dal cliente
2. `inviata` - Inviata al commercialista
3. `documentazione_incompleta` - Richiesta integrazione
4. `in_revisione` - In lavorazione
5. `pronta` - Pronta per presentazione
6. `presentata` - Presentata all'AdE
7. `archiviata` - Chiusa

**Da Completare (Fase 2):**
- Sezioni form rimanenti: Canoni Locazione, Affitto Pagato, Investimenti, Criptomonete, Plusvalenze, Deduzioni, Deduzioni Canarie
- Dashboard documenti con upload categorizzato
- Sezione Note cliente
- Admin: gestione creazione nuovi tipi dichiarazione (UI)
- Contatore pratiche dinamico nella stats card

### Fase 40 (28 Marzo 2026) - COMPLETATO ✅

**Refactoring Backend - Modularizzazione Routes**

**Obiettivo:** Spezzare il monolite `server.py` (~6000 righe) in moduli separati per migliorare manutenibilità.

**Lavoro Completato:**
- ✅ Creato `/app/backend/routes/tickets.py` - Router modulare per sistema Ticket
  - Tutti gli endpoint CRUD Tickets spostati
  - Export PDF ticket
  - Notifiche admin ticket
- ✅ Creato `/app/backend/routes/fees_routes.py` - Router modulare per Onorari
  - `/api/fees/all`, `/api/fees/summary`, `/api/fees/by-client`
  - `/api/fees/export-excel`
  - CRUD onorari per cliente
- ✅ Aggiornato `/app/backend/routes/models.py` con modelli Ticket e Fee aggiornati
- ✅ Aggiornato `/app/backend/routes/__init__.py` con nuovi export
- ✅ Aggiornato `/app/backend/server.py`:
  - Import nuovi router
  - Inizializzazione `set_db(db)` per condividere connessione DB
  - Include router: `tickets_router`, `tickets_admin_router`, `fees_global_router`, `client_fees_router`

**Struttura Routes Modulari:**
```
/app/backend/routes/
├── __init__.py          # Export router
├── deps.py              # Dipendenze condivise (get_db, get_current_user, etc.)
├── models.py            # Modelli Pydantic condivisi
├── tickets.py           # ✅ NUOVO - Routes Ticket (350+ righe)
├── fees_routes.py       # ✅ NUOVO - Routes Onorari (370+ righe)
├── auth.py              # Placeholder (da completare)
├── clients.py           # Placeholder (da completare)
├── documents.py         # Placeholder (da completare)
├── employees.py         # Placeholder (da completare)
├── consulenti.py        # Placeholder (da completare)
└── admin.py             # Placeholder (da completare)
```

**Test:** Verificato che entrambe le routes modulari funzionano correttamente via API e frontend.

**Da Completare (prossime sessioni):**
- Rimuovere codice duplicato da `server.py` (Tickets ~330 righe, Fees ~380 righe)
- Creare router per: Deadlines, Documents, Employees, Consulenti, Clients, Auth

### Fase 39 (28 Marzo 2026) - COMPLETATA ✅

**Sincronizzazione Automatica Clienti con Brevo**

**Richiesta Utente:** Sincronizzare automaticamente tutti i clienti registrati con Brevo, categorizzandoli in liste diverse in base alla tipologia (Autonomi, Società, etc.).

**Implementazione Backend:**
- Nuove funzioni in `email_service.py`:
  - `sync_contact_to_brevo()` - Crea/aggiorna contatto in Brevo
  - `update_contact_list_brevo()` - Aggiorna lista quando cambia tipo_cliente
  - `remove_contact_from_brevo()` - Disattiva contatto

- Mappatura tipo_cliente → Liste Brevo:
  - `autonomo` → Lista Autonomi (ID env: BREVO_LIST_AUTONOMI)
  - `societa` → Lista Società (ID env: BREVO_LIST_SOCIETA)
  - `vivienda_vacacional` → Lista Vivienda (ID env: BREVO_LIST_VIVIENDA)
  - `persona_fisica` → Lista Privati (ID env: BREVO_LIST_PRIVATI)

- Attributi sincronizzati con Brevo:
  - NOME, COGNOME, FULLNAME
  - TIPO_CLIENTE
  - TELEFONO
  - CODICE_FISCALE, NIE, NIF, CIF

**Trigger di Sincronizzazione:**
1. **Registrazione Cliente** (`POST /auth/register`):
   - Crea contatto in Brevo
   - Assegna alla lista corretta in base a tipo_cliente
   
2. **Modifica Cliente** (`PUT /clients/{id}`):
   - Se cambia tipo_cliente, aggiorna la lista Brevo
   - Rimuove dalla vecchia lista, aggiunge alla nuova

**Gestione Duplicati:**
- Verifica se il contatto esiste già (by email)
- Se esiste: aggiorna attributi e lista
- Se non esiste: crea nuovo contatto

**Test:** Verificato creazione contatto "testsync@example.com" in lista 3 (Società).

### Fase 38 (28 Marzo 2026) - COMPLETATA ✅

**Sezione "Ticket" Globale nella Dashboard Amministratore**

**Richiesta Utente:** Aggiungere sezione centralizzata per gestione ticket di tutti i clienti nella dashboard principale admin, con filtri, ordinamento e export PDF.

**Implementazione Backend:**
- Nuovo endpoint `GET /api/tickets/{id}/export-pdf` - Esporta ticket completo in PDF con:
  - Header "Fiscal Tax Canarie - Copia Certificata"
  - Dati cliente, date apertura/chiusura
  - Badge stato colorato
  - Storico completo conversazione
  - Footer con data generazione
- Dipendenza aggiunta: `reportlab==4.4.10`

**Implementazione Frontend:**
- Nuovo componente `GlobalTicketManagement.jsx`:
  - 4 card riepilogative: Totale, Aperti (verde), Chiusi (grigio), Archiviati (rosso)
  - Card cliccabili per filtro rapido
  - Barra filtri: ricerca, stato, cliente
  - Layout 2 colonne: lista ticket + dettaglio
  - Ticket aperti in cima alla lista con indicatore verde pulsante
  - Pulsante "Esporta PDF" per download copia certificata
  - Pulsanti azione: Chiudi, Archivia, Riapri, Elimina
- Tab "Ticket" aggiunto in `CommercialDashboard.jsx`

**Caratteristiche UI:**
- Indicatore verde pulsante per ticket aperti
- Bordatura verde-sinistra per ticket aperti nella lista
- Card "Aperti" con bordo verde cliccabile
- Filtro per cliente specifico o tutti i clienti
- Conteggio ticket trovati in tempo reale

**Test:** Verificato con creazione ticket, risposta admin, export PDF.

### Fase 37 (28 Marzo 2026) - COMPLETATA ✅

**Sistema di Ticketing - Sostituzione sezione "Note"**

**Richiesta Utente:** Trasformare la sezione "Note" in un sistema di ticketing completo con conversazione bidirezionale cliente-admin, stati, filtri e indicatori visivi.

**Implementazione Backend:**
- Nuovi modelli Pydantic: `TicketCreate`, `TicketUpdate`, `TicketResponse`, `TicketMessage`
- Collection MongoDB: `db.tickets`, `db.admin_notifications`
- Endpoint:
  - `POST /api/tickets` - Creazione ticket (solo cliente)
  - `GET /api/tickets` - Lista ticket (filtrata per ruolo)
  - `GET /api/tickets/{id}` - Dettaglio ticket
  - `POST /api/tickets/{id}/messages` - Aggiunta messaggio
  - `PUT /api/tickets/{id}/status` - Cambio stato (solo admin)
  - `DELETE /api/tickets/{id}` - Eliminazione (solo admin)
  - `GET /api/admin/ticket-notifications` - Notifiche ticket per admin

**Implementazione Frontend:**
- Nuovi componenti:
  - `TicketManagementClient.jsx` - Gestione ticket lato cliente
  - `TicketManagementAdmin.jsx` - Gestione ticket lato admin
- Tab rinominato: "Note" → "Ticket" in `ClientDashboard.jsx` e `ClientDetail.jsx`
- Layout a 2 colonne: lista ticket + dettaglio conversazione
- Filtri per stato: Aperti, Chiusi, Archiviati, Tutti
- Barra di ricerca ticket
- Pulsanti azione: Chiudi, Archivia, Riapri, Elimina

**Stati Ticket:**
- `aperto` - Badge verde
- `chiuso` - Badge grigio
- `archiviato` - Badge rosso

**Workflow:**
1. Cliente apre ticket → Notifica admin
2. Admin risponde → Messaggio visibile a cliente
3. Admin può chiudere/archiviare
4. Ticket chiuso/archiviato non permette risposte (admin può riaprire)

**Test:** Verificato al 100% con testing agent (iteration_21.json) - Backend 20/20, Frontend 100%.

### Fase 36 (28 Marzo 2026) - COMPLETATA ✅

**Campo "Link di Approfondimento" per Modelli Tributari**

**Richiesta Utente:** Aggiungere per ogni modello tributario un campo per inserire un URL di approfondimento esterno, visibile ai clienti come pulsante "Approfondisci".

**Implementazione Backend:**
- Aggiunto campo `link_approfondimento: Optional[str]` ai modelli Pydantic `ModelloTributarioCreate` e `ModelloTributarioResponse`
- Il campo viene salvato nel database e restituito dagli endpoint GET

**Implementazione Frontend Admin (`ModelsManagement.jsx`):**
- Aggiunto campo input URL "Link di Approfondimento (opzionale)" nel form di creazione/modifica modello
- Validazione URL lato frontend (blocca salvataggio se URL non valido)
- Icona ExternalLink blu per identificare visivamente il campo
- Testo descrittivo sotto il campo

**Implementazione Frontend Cliente (`ClientDashboard.jsx`):**
- Nel dialog del modello, se `link_approfondimento` è valorizzato, viene mostrato un pulsante blu "Approfondisci"
- Il pulsante apre il link in una nuova scheda (`target="_blank"`)
- Se il campo è vuoto/null, il pulsante non viene mostrato

**Test:** Verificato creazione modello con link e visualizzazione corretta.

### Fase 35 (28 Marzo 2026) - COMPLETATA ✅

**1. Disabilitazione Notifiche Email per Upload Documenti**
- Rimosse tutte le chiamate automatiche a `notify_document_uploaded()` nel backend
- Le notifiche per upload documenti non vengono più inviate automaticamente via Brevo
- Rimangono attive: notifiche scadenze, promemoria, comunicazioni globali/amministrative

**2. Rimozione Completa Sezioni Certificati Digitali / Firma Digitale**
- Rimosso tab "Firma Digitale" dalla scheda cliente admin (`ClientDetail.jsx`)
- Rimosso tab "Certificati" dalla scheda cliente admin (`ClientDetail.jsx`)
- Rimosso tab "Certificati" dalla dashboard cliente (`ClientDashboard.jsx`)
- Rimossa route `/admin/signatures` da `App.js`
- Rimosse tutte le variabili, funzioni e import relativi a certificati e firma digitale
- Interfaccia semplificata e pulita

### Fase 34 (28 Marzo 2026) - COMPLETATA ✅

**Ristrutturazione Completa Sezione "Onorari" + Export Excel**
(vedere dettagli nella sezione precedente del PRD)

**Richiesta Utente:** Gestione onorari coerente tra vista globale e scheda cliente, con sezione "Iguala mensile" che mostri lista completa clienti e relativi importi ricorrenti, più export Excel con filtri per categoria.

**Implementazione Backend:**
- Aggiornati modelli Pydantic `FeeCreate`, `FeeUpdate`, `FeeResponse` con nuovi campi:
  - `fee_type`: standard, consulenza, pratica, dichiarazione, iguala_buste_paga, iguala_contabilita, iguala_domicilio
  - `is_recurring`: boolean (auto-true per tipi iguala_*)
  - `recurring_month`: YYYY-MM per onorari mensili
  - `due_date`: ora opzionale (richiesto solo per pratica/dichiarazione)
- Nuovo endpoint `GET /api/fees/by-client`: clienti con onorari raggruppati + iguala_monthly
- Nuovo endpoint `GET /api/fees/export-excel?category=&fee_type=`: export Excel con filtri

**Implementazione Frontend - GlobalFeesManagement.jsx:**
- **4 Summary Cards**: Clienti con Onorari, In Attesa, Pagati, Iguala Mensili
- **Tab "Per Cliente"**: Lista clienti con search, filtro categoria, conteggio onorari, click per dettaglio
- **Tab "Iguala (Mensili)"**:
  - Header teal con totale mensile e conteggio clienti
  - Toggle "Per Categoria" / "Lista Clienti"
  - Vista Categoria: 3 cards (Buste Paga, Contabilità, Domicilio) con lista onorari
  - Vista Lista Clienti: Tabella con colonne Cliente, Categoria, Buste Paga, Contabilità, Domicilio, Totale + filtri search/categoria
- **Export Excel Dialog**: Filtri per categoria cliente e tipo onorario

**Implementazione Frontend - FeeManagement.jsx:**
- Stesso FEE_TYPES della vista globale
- Dropdown "Tipo Onorario" con 7 opzioni
- Campo "Data Scadenza" condizionale (solo per pratica/dichiarazione)
- Campo "Mese di Riferimento" condizionale (solo per tipi iguala_*)
- Card riepilogo con "Iguala Mensile" aggiunta

**Dipendenze Aggiunte:**
- `openpyxl==3.1.5` per export Excel

**Test:** Verificato al 100% con testing agent (iteration_20.json) - Backend 14/14, Frontend 13/13.

### Fase 1-33 - COMPLETATE ✅
(vedere PRD precedente per dettagli)

## Tipi di Onorario

| Tipo | Label | Richiede Scadenza | È Ricorrente |
|------|-------|-------------------|--------------|
| standard | Onorario Standard | No | No |
| consulenza | Consulenza | No | No |
| pratica | Pratica/Procedura | Sì | No |
| dichiarazione | Dichiarazione Fiscale | Sì | No |
| iguala_buste_paga | Iguala - Buste Paga | No | Sì |
| iguala_contabilita | Iguala - Contabilità Società | No | Sì |
| iguala_domicilio | Iguala - Domicilio Sociale | No | Sì |

## API Endpoints Onorari

```
GET /api/fees/all?status=&client_type=&fee_type=
GET /api/fees/summary
GET /api/fees/by-client
GET /api/fees/export-excel?category=&fee_type=
GET /api/clients/{client_id}/fees
GET /api/clients/{client_id}/fees/summary
POST /api/clients/{client_id}/fees
PUT /api/clients/{client_id}/fees/{fee_id}
DELETE /api/clients/{client_id}/fees/{fee_id}
```

## Database Schema Fees (Aggiornato)

```json
{
  "id": "uuid",
  "client_id": "uuid",
  "description": "string",
  "amount": 150.00,
  "due_date": "YYYY-MM-DD | null",
  "status": "pending|paid|overdue",
  "paid_date": "YYYY-MM-DD | null",
  "notes": "string | null",
  "fee_type": "standard|consulenza|pratica|dichiarazione|iguala_buste_paga|iguala_contabilita|iguala_domicilio",
  "is_recurring": "boolean",
  "recurring_month": "YYYY-MM | null",
  "created_by": "uuid",
  "created_at": "ISO datetime"
}
```

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot, analisi documenti, ricerca semantica
- **Brevo**: Email transazionali, promemoria, notifiche dipendenti
- **pyHanko**: Firma digitale PDF con certificati .p12
- **Backblaze B2**: Storage cloud file

## Ruoli Utente
- **commercialista**: Accesso completo, gestione clienti/documenti/consulenti/dipendenti/onorari
- **cliente**: Accesso ai propri documenti, chatbot, scadenze, gestione dipendenti
- **consulente_lavoro**: Dashboard limitata, clienti assegnati, buste paga

## Next Tasks (P0-P1)
1. **P1**: Continuare refactoring `server.py` (ORA 5245 righe, ridotto da 6019):
   - ✅ COMPLETATO: Rimosso codice duplicato Tickets e Fees (774 righe rimosse)
   - Creare router per: Deadlines, Documents, Employees, Consulenti, Clients, Auth
2. **P1**: Refactoring `ClientDetail.jsx` (>2300 righe) in sotto-componenti
3. **P1**: Refactoring `CommercialDashboard.jsx` (>1900 righe) in sotto-componenti
4. **P2**: Completare traduzione testi UI usando `t()` function (IT/EN/ES)

## Future Tasks (P2-P3)
- P2: Integrazione Dropbox (in attesa risposta utente)
- P2: App desktop (Electron) o mobile (React Native/Expo)
- P2: Migrazione file esistenti da MongoDB a Backblaze B2
- P3: WhatsApp Business Integration
- P3: Promemoria automatici schedulati (cron job)
- P3: Report esportabili PDF
- P3: Versioning documenti con storico modifiche
