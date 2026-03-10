# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni.

## What's Been Implemented

### Fase 1-8 - COMPLETATE ✅
(vedere changelog precedente)

### Fase 19 (10 Marzo 2026) - COMPLETATA ✅

**Sistema Invito Consulente del Lavoro via Email**

Implementato flusso di invito simile a quello dei clienti:
1. Admin inserisce nome ed email del consulente (NO password)
2. Sistema invia email con link di registrazione
3. Consulente clicca il link e imposta la propria password
4. Account consulente attivato automaticamente

Backend:
- `POST /api/consulenti/invite`: Crea invito e invia email
- `GET /api/consulenti/invitations`: Lista inviti pendenti
- `POST /api/consulenti/resend-invite/{id}`: Reinvia invito
- `POST /api/auth/complete-registration`: Ora supporta anche role=consulente_lavoro

Frontend:
- ConsulentiManagement.jsx: Nuovo form invito (solo nome + email)
- Sezione "Inviti in attesa di registrazione" con pulsante Reinvia
- Dialog invito mostra messaggio informativo e link di backup

**Fix Caricamento Globale Documenti**

- Corretto errore SelectItem con valore vuoto (value="" → value="all")
- Corretto filtro clienti attivi (status → stato)
- Ora mostra correttamente "22 clienti attivi" invece di "0"

File modificati:
- `/app/backend/server.py`: Nuovi endpoint invito consulenti
- `/app/frontend/src/components/ConsulentiManagement.jsx`: Nuovo flusso invito
- `/app/frontend/src/pages/CommercialDashboard.jsx`: Fix GlobalDocumentUpload

### Fase 18 (10 Marzo 2026) - COMPLETATA ✅

**Recupero Password per Clienti**

Flusso completo implementato:
1. **Richiesta reset**: Cliente inserisce email → riceve link via email
2. **Verifica token**: Sistema verifica validità del link (scade dopo 1 ora)
3. **Nuova password**: Cliente imposta nuova password con validazione

Backend:
- `POST /auth/forgot-password`: Invia email con link di reset
- `GET /auth/verify-reset-token`: Verifica validità token
- `POST /auth/reset-password`: Salva nuova password

Frontend:
- `/forgot-password`: Pagina richiesta recupero password
- `/reset-password?token=xxx`: Pagina impostazione nuova password
- Link "Password dimenticata?" nella pagina login

Sicurezza:
- Token singolo uso
- Scadenza token: 1 ora
- Non rivela se l'email esiste nel sistema
- Password minimo 6 caratteri

File creati/modificati:
- `/app/backend/server.py`: Endpoints password reset
- `/app/frontend/src/pages/ForgotPassword.jsx`: Nuova pagina
- `/app/frontend/src/pages/ResetPassword.jsx`: Nuova pagina
- `/app/frontend/src/pages/LoginPage.jsx`: Link "Password dimenticata?"
- `/app/frontend/src/App.js`: Routes nuove pagine

### Fase 17 (10 Marzo 2026) - COMPLETATA ✅

**Cronologia Comunicazioni nella Dashboard Cliente**

- Aggiunta nuova tab "Comunicazioni" nella dashboard cliente
- Visualizza tutte le notifiche ricevute dallo studio
- Mostra tipo di notifica con icona appropriata (documento, scadenza, email, dipendente)
- Badge per indicare se inviata via email
- Timestamp formattato in italiano
- Stato vuoto friendly quando non ci sono comunicazioni

File modificati:
- `/app/frontend/src/pages/ClientDashboard.jsx`: Nuova tab comunicazioni con cronologia

### Fase 16 (10 Marzo 2026) - COMPLETATA ✅

**Miglioramenti Dashboard e Notifiche Dipendenti**

1. **Dettaglio Dipendente - Consulente Assegnato:**
   - Solo l'amministratore può vedere quale consulente è stato assegnato al dipendente
   - Campo visualizzato in box viola nel dettaglio dipendente

2. **Notifiche per Richieste Assunzione/Licenziamento:**
   - Notifica interna a tutti i consulenti del lavoro
   - Notifica interna a tutti gli admin
   - Email automatica ai consulenti con tutti i dettagli

3. **Email Modifiche Dipendenti:**
   - Quando l'admin modifica un dipendente, i consulenti ricevono email
   - Include dettaglio delle modifiche effettuate

4. **Cronologia Notifiche:**
   - Componente `ClientNotificationsHistory` integrato nella tab Notifiche
   - Visibile sia da admin che da cliente (endpoint `/my-notifications-history`)

5. **Caricamento Globale Documenti:**
   - Nuova tab "Caricamento Globale" nella dashboard admin
   - 3 modalità: Tutti i clienti, Per categoria, Selezione manuale
   - Opzione per notificare i clienti via email

6. **Rinomina "Liste" → "Categorie":**
   - Menu principale
   - Pagina DeadlinesManagement
   - Tutti i riferimenti nell'interfaccia

File modificati:
- `/app/backend/server.py`: Notifiche licenziamento, email modifiche, endpoint cronologia cliente
- `/app/frontend/src/pages/CommercialDashboard.jsx`: Tab caricamento globale, categorie
- `/app/frontend/src/pages/ClientDetail.jsx`: Integrazione cronologia notifiche
- `/app/frontend/src/components/EmployeeManagementAdmin.jsx`: Visualizzazione consulente assegnato
- `/app/frontend/src/pages/DeadlinesManagement.jsx`: Rinomina liste→categorie

### Fase 15 (10 Marzo 2026) - COMPLETATA ✅

**Sezione Dipendenti nella Scheda Cliente + Notifiche Consulenti**

1. **Tab Dipendenti in ClientDetail:**
   - Aggiunta nuova tab "Dipendenti" nella scheda di ogni cliente
   - Admin e consulenti del lavoro possono ora vedere i dipendenti del cliente dalla sua scheda
   - Filtro automatico per `client_id` nell'API `/employees`

2. **Notifiche Assunzione ai Consulenti:**
   - Quando un cliente richiede un'assunzione, vengono creati:
     - Notifica interna per ogni consulente del lavoro
     - Notifica interna per ogni admin (commercialista)
   - Email automatica inviata a ogni consulente del lavoro con tutti i dettagli:
     - Nome dipendente, mansione, data inizio
     - Luogo di lavoro, orario, giorni lavorativi
     - Ore settimanali e note

File modificati:
- `/app/frontend/src/pages/ClientDetail.jsx`: Aggiunta tab Dipendenti con componente `EmployeeManagementAdmin`
- `/app/frontend/src/components/EmployeeManagementAdmin.jsx`: Aggiunto supporto per filtro `clientId`
- `/app/backend/server.py`: Modificato endpoint `/employees/hire-request` per notifiche a consulenti

### Fase 14 (10 Marzo 2026) - COMPLETATA ✅

**Modifica Form Assunzione Dipendente (lato cliente)**

Modifiche richieste e implementate:
1. ❌ **Rimosso** campo "Tipo Contratto"
2. ❌ **Rimosso** campo "Stipendio (€/mese)"
3. ✅ **Aggiunto** campo "Ore Settimanali di Lavoro" con max 40 ore (validazione frontend + backend)
4. ✅ **Aggiunto** campo upload "Documento di Riconoscimento" (passaporto, carta identità)
5. ✅ **Aggiunto** campo upload "NIE (Número de Identidad de Extranjero)"

File modificati:
- `/app/backend/server.py`: Aggiornato modello `EmployeeHireRequest` e `EmployeeUpdate`, aggiunta validazione max 40 ore
- `/app/frontend/src/components/EmployeeManagementClient.jsx`: Aggiornato form con nuovi campi e upload documenti automatico

**Sistema Multilingua Completato**

Implementazione completa del sistema di traduzione IT/EN/ES:
1. ✅ `LandingPage.jsx` - Tradotta completamente (hero, features, benefits, footer)
2. ✅ `LoginPage.jsx` - Tradotta completamente (form, messaggi, link)
3. ✅ `ClientDashboard.jsx` - Tab e header tradotti
4. ✅ `CommercialDashboard.jsx` - Tab e header tradotti
5. ✅ `translations.js` - Aggiunte sezioni `landing` e `employees` per tutte le lingue

Le bandierine IT/EN/ES ora funzionano correttamente e cambiano la lingua dell'interfaccia in tempo reale.

### Fase 13 (10 Marzo 2026) - COMPLETATA ✅

**Gestione Dipendenti**

1. **Lato Cliente - Richiesta Assunzione:**
   - Form completo per richiedere assunzione dipendente
   - Campi: nome, data inizio, mansione, orario, luogo lavoro, giorni lavorativi, ore settimanali
   - Upload documenti: documento identità, NIE
   - Richiesta licenziamento con data e motivo

2. **Lato Admin/Consulente - Gestione:**
   - Dashboard dipendenti con statistiche colorate per stato
   - 🟢 Verde = Attivo | 🟠 Arancione = In attesa | 🔴 Rosso = Cessato
   - Attivazione dipendenti (pending → active)
   - Conferma licenziamenti (termination_pending → terminated)
   - Upload documentazione: contratto, registro orario, altro
   - Filtro per stato

3. **Sistema Notifiche:**
   - Notifiche in-app con badge conteggio
   - Email automatiche a:
     - amministrazione@fiscaltaxcanarie.com
     - segreteria@fiscaltaxcanarie.com
     - bruno@fiscaltaxcanarie.com
     - francesco@fiscaltaxcanarie.com
   - Notifiche per: richieste assunzione, licenziamento, upload documenti

4. **Endpoint API:**
   - `POST /api/employees/hire-request` - Richiesta assunzione
   - `GET /api/employees` - Lista dipendenti
   - `POST /api/employees/{id}/documents` - Upload documento
   - `POST /api/employees/{id}/terminate` - Richiesta licenziamento
   - `PUT /api/employees/{id}` - Aggiorna stato (solo admin/consulente)
   - `GET /api/employee-notifications` - Lista notifiche
   - `GET /api/employee-notifications/count` - Conteggio non lette

### Fase 12 (10 Marzo 2026) - COMPLETATA ✅

**Miglioramenti UI e Multilingua**

1. **Link Invito Aggiornato**
   - I link di invito ora puntano a `https://app.fiscaltaxcanarie.com/complete-registration?token=...`
   - Variabile `FRONTEND_URL` configurabile in `.env`

2. **Badge Emergent Rimosso**
   - Rimosso il badge "Made with Emergent" da `index.html`

3. **Sistema Multilingua (Infrastruttura)**
   - Creato file traduzioni: `/app/frontend/src/i18n/translations.js` (IT, EN, ES)
   - Creato `LanguageContext` per gestione lingua globale
   - Creato `LanguageSelector` con bandierine (🇮🇹 🇬🇧 🇪🇸)
   - Lingua salvata in localStorage (persistente)
   - Bandierine aggiunte in: LandingPage, LoginPage, CommercialDashboard, ClientDashboard, ConsulenteDashboard

### Fase 11 (10 Marzo 2026) - COMPLETATA ✅

**5 Nuove Funzionalità Richieste**

1. **Chiavi Consultive Bancarie**
   - Sezione nell'anagrafica cliente per gestire credenziali di accesso bancario
   - Entità bancarie predefinite: Revolut, Caixa, Santander, BBVA, Cajamar
   - Possibilità di creare nuove entità bancarie personalizzate
   - Campi: Banca, Nome Utente, Password (con toggle visibilità)
   - Endpoint: `/api/bank-entities`, `/api/clients/{id}/bank-credentials`

2. **Riconoscimento Automatico Buste Paga**
   - L'AI analizza i documenti caricati e identifica le buste paga
   - Se riconosciuta come busta paga, viene archiviata automaticamente nella sezione "Buste Paga"
   - Estrae mese e anno dalla busta paga
   - Campo `is_busta_paga` nella risposta AI

3. **Ruolo Consulente del Lavoro**
   - Nuovo ruolo con permessi limitati
   - Dashboard dedicata (`/consulente`) con vista ristretta
   - Può vedere solo i clienti assegnati dall'amministratore
   - Può caricare solo buste paga
   - Endpoint: `/api/consulenti`, `/api/consulenti/{id}/assign-clients`, `/api/consulente/*`

4. **Email Multiple per Cliente**
   - Possibilità di associare più indirizzi email a un cliente
   - Sezione "Email Aggiuntive" nell'anagrafica
   - Email principale evidenziata
   - Endpoint: `/api/clients/{id}/emails`

5. **Tipo Cliente all'Invito + Filtro**
   - Campo "Tipo Cliente" nel form di invito: Autonomo, Società, Privato
   - Filtro per tipo nella lista clienti
   - Badge colorato per tipo nella lista

### Fase 10 (10 Marzo 2026) - COMPLETATA ✅

**Refactoring Flusso di Invito Clienti**

1. **Nuovo Flusso di Invito**
   - Il commercialista inserisce l'email di NOTIFICA del cliente
   - Il cliente riceve un link e sceglie la propria EMAIL DI ACCESSO durante la registrazione
   - L'email di notifica viene salvata come contatto secondario (`email_notifica`)

2. **Collection `invitations`**
   - Nuova collection per gestire gli inviti separatamente dagli utenti
   - Schema: `{id, notification_email, suggested_name, invitation_token, invited_by, status: "pending"|"completed", expires_at}`
   - L'invito scade dopo 7 giorni

3. **Endpoint Modificati**
   - `POST /api/clients/invite` - Crea record in `invitations` (non più in `users`)
   - `POST /api/auth/complete-registration` - Accetta campo `email` per l'email di accesso scelta dal cliente
   - `POST /api/clients/resend-invite/{invite_id}` - Usa `invite_id` dalla collection `invitations`
   - `GET /api/invitations` - Lista inviti pendenti

4. **Frontend Aggiornato**
   - Dashboard: sezione "Inviti in attesa di registrazione" con pulsante "Reinvia"
   - CompleteRegistration: nuovo campo "La tua Email di Accesso"

### Fase 9 (10 Marzo 2026) - COMPLETATA ✅

**Sistema Backup & Storage Cloud**

1. **Storage Cloud (Emergent Object Storage)**
   - Integrazione con storage cloud illimitato
   - Limite file: 100 MB (vs 16 MB di MongoDB)
   - Migrazione file da MongoDB a cloud
   - Endpoint `/api/storage/status` per statistiche

2. **Backup Completo (ZIP)**
   - Endpoint `GET /api/backup/full` - Tutti i clienti, documenti, configurazioni
   - Endpoint `GET /api/backup/client/{id}` - Backup singolo cliente
   - Struttura organizzata per cartelle
   - Include metadati JSON + file originali

3. **Export Database (JSON)**
   - Endpoint `GET /api/backup/export-json`
   - Tutti i dati senza file binari
   - Utile per migrazione/analisi

4. **Frontend Backup**
   - Pagina `/admin/backup` dedicata
   - Status storage cloud con statistiche
   - Pulsanti download backup
   - Storico backup effettuati
   - Pulsante backup singolo cliente

5. **Migrazione Cloud**
   - Endpoint `POST /api/storage/migrate-to-cloud`
   - Migrazione automatica in background
   - Rimuove file_data da MongoDB dopo migrazione

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## API Endpoints Nuovi (Fase 9)

```
POST /api/deadlines
Body:
{
  "title": "Dichiarazione IGIC Q1",
  "description": "...",
  "due_date": "2025-04-20",
  "category": "IGIC",
  "priority": "alta",
  "is_recurring": true,
  "recurrence_type": "trimestrale",  // mensile | trimestrale | annuale
  "recurrence_end_date": "2026-12-31",  // opzionale
  "list_ids": ["list-uuid-1", "list-uuid-2"],
  "client_ids": [],
  "send_reminders": true,
  "reminder_days": [7, 3, 1, 0],
  "send_notification": true
}

Response:
{
  "id": "uuid",
  "title": "...",
  "is_recurring": true,
  "recurrence_type": "trimestrale",
  "next_occurrence": "2025-07-20",  // auto-calcolato
  "last_reminder_sent": null,
  ...
}

POST /api/deadlines/send-reminders
Response:
{
  "success": true,
  "reminders_sent": 15,
  "deadlines_processed": 5,
  "errors": null
}
```

## Database Schema Deadline

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "due_date": "YYYY-MM-DD",
  "category": "string",
  "priority": "bassa|normale|alta|urgente",
  "status": "da_fare|in_lavorazione|completata|scaduta",
  "is_recurring": true,
  "recurrence_type": "mensile|trimestrale|annuale",
  "recurrence_end_date": "YYYY-MM-DD",
  "client_ids": ["uuid"],
  "list_ids": ["uuid"],
  "send_reminders": true,
  "reminder_days": [7, 3, 1, 0],
  "last_reminder_sent": "ISO datetime",
  "next_occurrence": "YYYY-MM-DD",
  "parent_deadline_id": "uuid",  // per scadenze rigenerate
  "created_at": "ISO datetime"
}
```

## Database Schema Fees (Onorari)

```json
{
  "id": "uuid",
  "client_id": "uuid",
  "description": "string",
  "amount": 150.00,
  "due_date": "YYYY-MM-DD",
  "status": "pending|paid",
  "paid_date": "YYYY-MM-DD",
  "notes": "string",
  "created_by": "uuid",
  "created_at": "ISO datetime"
}
```

## Database Schema Bank Entities

```json
{
  "id": "uuid",
  "name": "string (Revolut, Caixa, etc.)",
  "is_default": "boolean",
  "created_by": "uuid (null for defaults)",
  "created_at": "ISO datetime"
}
```

## Database Schema Bank Credentials (in users collection)

```json
{
  "bank_credentials": [
    {
      "id": "uuid",
      "bank_entity_id": "uuid",
      "username": "string",
      "password": "string",
      "created_at": "ISO datetime"
    }
  ],
  "additional_emails": ["email1", "email2"]
}
```

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot, analisi documenti, ricerca semantica
- **Brevo**: Email transazionali, promemoria, notifiche dipendenti
- **pyHanko**: Firma digitale PDF con certificati .p12
- **Backblaze B2**: Storage cloud file

## Ruoli Utente
- **commercialista**: Accesso completo, gestione clienti/documenti/consulenti/dipendenti
- **cliente**: Accesso ai propri documenti, chatbot, scadenze, gestione dipendenti
- **consulente_lavoro**: Dashboard limitata, clienti assegnati, buste paga, gestione dipendenti clienti assegnati

## Database Schema Employees

```json
{
  "id": "uuid",
  "client_id": "uuid (proprietario)",
  "full_name": "string",
  "start_date": "YYYY-MM-DD",
  "job_title": "string",
  "work_hours": "08:00-17:00",
  "work_location": "string",
  "work_days": "Lunedì-Venerdì",
  "salary": "number",
  "contract_type": "indeterminato|determinato|stagionale|part-time",
  "status": "pending|active|termination_pending|terminated",
  "documents": [{ "id", "document_type", "file_data", ... }],
  "created_at": "ISO datetime"
}
```

## Next Tasks
1. **P0**: Refactoring `server.py` (~4000+ righe) in moduli separati (APIRouter per risorsa)
2. **P0**: Refactoring `ClientDetail.jsx` (>2500 righe) in sotto-componenti
3. **P0**: Refactoring `CommercialDashboard.jsx` (>1500 righe) in sotto-componenti
4. **P1**: Completare traduzione testi UI usando `t()` function (IT/EN/ES) per tutti i componenti
5. **P1**: Migrazione file esistenti da MongoDB a Backblaze B2
6. **P2**: Versioning documenti con storico modifiche
7. **P3**: Report esportabili (PDF/Excel)

## Future Tasks
- WhatsApp Business Integration
- Promemoria automatici schedulati (cron job)
- Valutazione accesso automatico portali governativi (AEAT, Seguridad Social)
- Cifratura password credenziali bancarie (attualmente plaintext)

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+
