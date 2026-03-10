# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni.

## What's Been Implemented

### Fase 1-8 - COMPLETATE ✅
(vedere changelog precedente)

### Fase 13 (10 Marzo 2026) - COMPLETATA ✅

**Gestione Dipendenti**

1. **Lato Cliente - Richiesta Assunzione:**
   - Form completo per richiedere assunzione dipendente
   - Campi: nome, data inizio, mansione, orario, luogo lavoro, giorni lavorativi, tipo contratto, stipendio, note
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
1. **P1**: Migrazione file esistenti da MongoDB a Backblaze B2
2. **P2**: Refactoring `server.py` (~3700 righe) in moduli separati
3. **P2**: Refactoring `ClientDetail.jsx` (>2000 righe) in sotto-componenti
4. **P2**: Versioning documenti con storico modifiche
5. **P3**: Report esportabili (PDF/Excel)

## Future Tasks
- Completare traduzione testi UI usando `t()` function (IT/EN/ES)
- WhatsApp Business
- Promemoria automatici schedulati (cron job)
- Valutazione accesso automatico portali governativi (AEAT, Seguridad Social)
- Cifratura password credenziali bancarie (attualmente plaintext)
