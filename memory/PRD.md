# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni.

## What's Been Implemented

### Fase 1-6 - COMPLETATE ✅
(vedere changelog precedente)

### Fase 7 (9 Marzo 2026) - COMPLETATA ✅

**Scadenze Ricorrenti con Promemoria Automatici**

1. **Scadenze ricorrenti**
   - Frequenze: mensile, trimestrale, annuale
   - Data fine ricorrenza opzionale
   - Calcolo automatico `next_occurrence` basato su frequenza
   - Rigenerazione automatica dopo completamento

2. **Assegnazione a liste di clienti**
   - Campo `list_ids` per assegnare a multiple liste
   - Selezione multipla con checkbox
   - Email inviate a tutti i clienti delle liste selezionate

3. **Promemoria automatici**
   - Default: 7, 3, 1 giorni prima + giorno stesso
   - Campo `reminder_days` personalizzabile
   - `last_reminder_sent` per evitare duplicati
   - Endpoint `POST /api/deadlines/send-reminders` per invio manuale

4. **Pagina dedicata `/admin/deadlines`**
   - Creazione scadenze per liste
   - Pulsante "Invia Promemoria Ora"
   - Visualizzazione scadenze assegnate a liste
   - Badge "ricorrente" con frequenza

5. **Form scadenza aggiornato in ClientDetail**
   - Switch "Scadenza ricorrente"
   - Dropdown frequenza (mensile/trimestrale/annuale)
   - Data fine ricorrenza opzionale
   - Switch "Promemoria automatici"
   - Switch "Invia notifica email immediata"
   - Pulsante dinamico "Crea Scadenza Ricorrente"

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## API Endpoints Scadenze (Aggiornati)

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

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot, analisi documenti, ricerca semantica
- **Brevo**: Email transazionali e promemoria

## Next Tasks
1. **P2**: Versioning documenti con storico modifiche
2. **P3**: Report esportabili (PDF/Excel)
3. **P3**: Sistema di audit trail completo

## Future Tasks
- Firma elettronica
- WhatsApp Business
- Multilingua (IT/ES)
- Promemoria automatici schedulati (cron job)
