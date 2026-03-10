# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni.

## What's Been Implemented

### Fase 1-7 - COMPLETATE ✅
(vedere changelog precedente)

### Fase 8 (10 Marzo 2026) - COMPLETATA ✅

**Flusso Invito Cliente**
1. **Endpoint invito**
   - `POST /api/clients/invite` - Crea cliente con solo email
   - `POST /api/auth/complete-registration` - Cliente completa registrazione con token
   - `POST /api/clients/resend-invite/{client_id}` - Reinvia invito
   - Email template dedicato con link univoco
   - Stato `pending` fino a completamento

2. **Frontend invito**
   - Pulsante "Invita Cliente" in dashboard commercialista
   - Dialog con campo email e nome opzionale
   - Pulsante "Reinvia" per clienti in attesa
   - Pagina `/complete-registration` per completare registrazione

**Sezione Onorari (solo Commercialista)**
1. **Collection `fees` in MongoDB**
   - CRUD completo onorari per cliente
   - Stati: pending, paid
   - Tracking data scadenza e data pagamento

2. **Endpoint onorari**
   - `GET/POST /api/clients/{client_id}/fees`
   - `PUT/DELETE /api/clients/{client_id}/fees/{fee_id}`
   - `GET /api/clients/{client_id}/fees/summary` - Totali e conteggi

3. **Frontend onorari**
   - Tab "Onorari" in pagina dettaglio cliente
   - Card riassuntive (Totale Pagato, In Attesa, Totale Generale)
   - Storico con azioni (Segna Pagato, Modifica, Elimina)
   - Form creazione con descrizione, importo, scadenza, note

**Firma Digitale con Certificati .p12**
1. **Servizio firma (pyHanko)**
   - `signing_service.py` con pyHanko
   - Upload e gestione certificati .p12
   - Firma PDF con metadati (firmatario, motivo, luogo)
   - Verifica firme

2. **Endpoint firma**
   - `POST /api/certificates/upload` - Carica certificato
   - `GET /api/certificates` - Lista certificati
   - `DELETE /api/certificates/{cert_name}` - Elimina certificato
   - `POST /api/documents/{doc_id}/sign` - Firma documento

3. **Frontend firma**
   - Pagina `/admin/signatures` per gestione certificati
   - Pulsante "Firma" su documenti PDF
   - Dialog con selezione certificato e password
   - Badge "Firmato" su documenti firmati

**Miglioramenti UI/UX Dashboard Cliente**
1. **Welcome Banner** con gradiente teal
2. **Card statistiche** con icone colorate e gradienti
3. **Layout due colonne** (Scadenze Imminenti + Ultimi Documenti)
4. **Sezione documenti** con design a card e categorie colorate

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## API Endpoints Nuovi (Fase 8)

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

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot, analisi documenti, ricerca semantica
- **Brevo**: Email transazionali e promemoria
- **pyHanko**: Firma digitale PDF con certificati .p12

## Next Tasks
1. **P2**: Versioning documenti con storico modifiche
2. **P3**: Report esportabili (PDF/Excel)
3. **P3**: Sistema di audit trail completo

## Future Tasks
- WhatsApp Business
- Multilingua (IT/ES)
- Promemoria automatici schedulati (cron job)
