# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni.

## What's Been Implemented

### Fase 1-8 - COMPLETATE ✅
(vedere changelog precedente)

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
