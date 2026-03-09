# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni. Collegata a fiscaltaxcanarie.com.

## User Personas
1. **Cliente**: Utente che accede alla propria area riservata per documenti, scadenze, buste paga
2. **Commercialista/Admin**: Account unico (info@fiscaltaxcanarie.com / Triana48+) con accesso completo

## Core Requirements (Static)
- Autenticazione JWT - registrazione SOLO per clienti
- Account commercialista predefinito
- Scadenze assegnate dal commercialista per tipo cliente (non predefinite)
- Upload documenti con analisi AI automatica
- Design: bianco + #3caca4 (teal) con TESTO BIANCO su sfondi teal

## What's Been Implemented

### Fase 1 - COMPLETATA ✅
- [x] Auth JWT con ruoli
- [x] Account commercialista predefinito
- [x] Registrazione SOLO per clienti
- [x] Tab con colori corretti (testo grigio su sfondo bianco)
- [x] Footer con numero telefono +34 658 071 848
- [x] Modelli Tributari con schede informative (8 modelli)

### Fase 2 - COMPLETATA ✅
- [x] **Classificazione AI documenti** con OpenAI GPT (via Emergent LLM Key)
- [x] Estrazione testo da PDF
- [x] Analisi automatica: tipo documento, modello tributario, descrizione
- [x] Suggerimento cliente, categoria e tag
- [x] Nome file standardizzato suggerito
- [x] Sezione "Caricamento Intelligente con AI" nel dettaglio cliente
- [x] Endpoint `/api/documents/upload-auto` con analisi AI
- [x] Endpoint `/api/documents/pending-verification` per documenti da verificare
- [x] Endpoint `/api/documents/{id}/verify` per confermare assegnazione
- [x] **Tab Scadenze** nel dettaglio cliente per assegnare scadenze per cliente
- [x] Scadenze NON predefinite (commercialista le crea manualmente per tipo cliente)

### Fase 3 - COMPLETATA ✅ (9 Marzo 2026)
- [x] **Assistente AI Chatbot** per clienti
  - Componente ChatBot.jsx nella dashboard cliente
  - Risponde in italiano su modelli tributari, scadenze, IGIC
  - Usa LlmChat con gpt-4o-mini via Emergent LLM Key
  - Mantiene conversazione in sessione
- [x] **Notifiche email automatiche con Brevo**
  - Email di benvenuto alla registrazione cliente
  - Notifica automatica quando documento caricato con AI
  - Notifica automatica quando scadenza creata (opzionale)
  - Templates HTML professionali con branding Fiscal Tax Canarie
- [x] **Tab Notifiche** in ClientDetail
  - Form per invio comunicazione manuale via email
  - Card con azioni rapide (promemoria scadenze, notifica documenti)
- [x] **Checkbox "Invia notifica email"** nel form creazione scadenze
- [x] **Pulsante promemoria** (icona campanella) nella lista scadenze

### Fase 4 - DA IMPLEMENTARE
- [ ] Statistiche avanzate con grafici
- [ ] Versioning documenti
- [ ] Log completo e audit trail
- [ ] Ricerca avanzata documenti
- [ ] Rinomina automatica file dopo analisi AI (`AAAA-MM-GG_TipoDocumento_NomeCliente.ext`)

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione cliente (invia email benvenuto)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Info utente corrente

### Clienti (Commercialista)
- `GET /api/clients` - Lista clienti
- `GET /api/clients/{id}` - Dettaglio cliente
- `PUT /api/clients/{id}` - Modifica cliente
- `DELETE /api/clients/{id}` - Archivia cliente

### Documenti
- `POST /api/documents` - Upload manuale
- `POST /api/documents/upload-auto` - Upload con analisi AI
- `GET /api/documents` - Lista documenti
- `GET /api/documents/{id}` - Dettaglio/download
- `DELETE /api/documents/{id}` - Elimina
- `GET /api/documents/pending-verification` - Da verificare
- `PUT /api/documents/{id}/verify` - Verifica assegnazione

### Scadenze
- `GET /api/deadlines` - Lista scadenze
- `POST /api/deadlines` - Crea (con opzione send_notification)
- `PUT /api/deadlines/{id}` - Modifica
- `PATCH /api/deadlines/{id}/status` - Cambia stato
- `DELETE /api/deadlines/{id}` - Elimina

### Chatbot
- `POST /api/chat` - Invia messaggio al chatbot
- `DELETE /api/chat/{conversation_id}` - Cancella conversazione

### Notifiche
- `POST /api/notifications/send-note` - Invia comunicazione
- `POST /api/notifications/send-document` - Notifica documento
- `POST /api/notifications/send-deadline-reminder` - Promemoria scadenza
- `GET /api/notifications/history` - Storico notifiche

### Altri
- `GET /api/modelli-tributari` - Lista modelli tributari
- `GET /api/stats` - Statistiche
- `GET /api/activity-logs` - Log attività

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot e analisi documenti (via Emergent LLM Key)
- **Brevo**: Email transazionali (sib-api-v3-sdk)

## Next Tasks (Priorità)
1. **P1**: Implementare rinomina automatica file dopo analisi AI
2. **P1**: Dashboard statistiche avanzate con grafici
3. **P2**: Ricerca semantica documenti
4. **P2**: Gestione documenti "da verificare" nella dashboard commercialista
5. **P3**: Scadenze ricorrenti con promemoria automatici

## Future Tasks
- Integrazione firma elettronica
- Integrazione WhatsApp Business
- Supporto multilingua (Italiano/Spagnolo)
- Sistema di audit trail completo
