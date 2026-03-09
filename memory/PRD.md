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
- [x] Classificazione AI documenti con OpenAI GPT
- [x] Estrazione testo da PDF
- [x] Analisi automatica: tipo documento, modello tributario, descrizione
- [x] Suggerimento cliente, categoria e tag
- [x] Nome file standardizzato automatico
- [x] Sezione "Caricamento Intelligente con AI" nel dettaglio cliente
- [x] Tab Scadenze per assegnare scadenze per cliente
- [x] Scadenze NON predefinite (commercialista le crea manualmente)

### Fase 3 - COMPLETATA ✅
- [x] **Assistente AI Chatbot** per clienti
- [x] **Notifiche email automatiche con Brevo**
  - Email di benvenuto alla registrazione
  - Notifica automatica documento caricato
  - Notifica automatica scadenza creata
- [x] **Tab Notifiche** in ClientDetail per comunicazioni manuali
- [x] Checkbox "Invia notifica email" nel form scadenze
- [x] Pulsante promemoria (campanella) nella lista scadenze

### Fase 4 - COMPLETATA ✅
- [x] **Rinomina automatica file** formato `YYYY-MM-DD_TipoDoc_NomeCliente.ext`
- [x] **Dashboard statistiche avanzate** con grafici SVG
- [x] **Ricerca semantica documenti** con AI
- [x] **Tab "Da Verificare"** per documenti pendenti

### Fase 5 (9 Marzo 2026) - COMPLETATA ✅
- [x] **Anagrafica cliente estesa** (Tab Anagrafica):
  - NIE (Número de Identidad de Extranjero)
  - NIF (Número de Identificación Fiscal)
  - CIF (Código de Identificación Fiscal per società)
  - Codice Fiscale italiano
  - Indirizzo completo (via, città, CAP, provincia)
  - IBAN conto bancario
  - Tipo cliente (autonomo/società/privato)
  - Regime fiscale e tipo attività
- [x] **Modifica dati cliente** con pulsante "Modifica"
- [x] **Eliminazione cliente**:
  - Archiviazione (stato = cessato)
  - Eliminazione permanente (cancella tutti i dati)
- [x] **Liste clienti personalizzate** (pagina /admin/lists):
  - Creazione liste con nome, descrizione, colore
  - Aggiunta/rimozione clienti dalle liste
  - Invio notifiche email a tutti i clienti di una lista
  - Conteggio clienti per lista
- [x] **Upload globale documenti multipli** (tab Caricamento Globale):
  - Caricamento più file contemporaneamente
  - AI identifica automaticamente il cliente
  - AI classifica il documento
  - Rinomina automatica file
  - Mostra risultati con stato "da verificare"
  - Notifica automatica al cliente se identificato

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione cliente (invia email benvenuto)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Info utente corrente

### Clienti (Commercialista)
- `GET /api/clients?tipo_cliente=&list_id=` - Lista clienti con filtri
- `GET /api/clients/{id}` - Dettaglio cliente con campi estesi
- `PUT /api/clients/{id}` - Modifica cliente (NIE, NIF, CIF, IBAN, etc.)
- `DELETE /api/clients/{id}?permanent=false` - Archivia o elimina cliente

### Liste Clienti
- `GET /api/client-lists` - Lista tutte le liste
- `POST /api/client-lists` - Crea nuova lista
- `PUT /api/client-lists/{id}` - Modifica lista
- `DELETE /api/client-lists/{id}` - Elimina lista
- `POST /api/client-lists/{list_id}/clients/{client_id}` - Aggiungi cliente
- `DELETE /api/client-lists/{list_id}/clients/{client_id}` - Rimuovi cliente
- `POST /api/client-lists/{list_id}/send-notification` - Invia email a lista

### Documenti
- `POST /api/documents` - Upload manuale
- `POST /api/documents/upload-auto` - Upload con AI
- `POST /api/documents/upload-batch` - Upload multiplo con AI
- `GET /api/documents` - Lista documenti
- `GET /api/documents/search?q=` - Ricerca semantica AI
- `GET /api/documents/pending-verification` - Da verificare
- `PUT /api/documents/{id}/verify` - Verifica assegnazione
- `PUT /api/documents/{id}/rename` - Rinomina documento
- `DELETE /api/documents/{id}` - Elimina

### Scadenze
- `GET /api/deadlines` - Lista scadenze
- `POST /api/deadlines` - Crea (con opzione send_notification)
- `PUT /api/deadlines/{id}` - Modifica
- `PATCH /api/deadlines/{id}/status` - Cambia stato
- `DELETE /api/deadlines/{id}` - Elimina

### Chatbot
- `POST /api/chat` - Invia messaggio al chatbot

### Notifiche
- `POST /api/notifications/send-note` - Invia comunicazione
- `POST /api/notifications/send-document` - Notifica documento
- `POST /api/notifications/send-deadline-reminder` - Promemoria scadenza

### Altri
- `GET /api/modelli-tributari` - Lista modelli tributari
- `GET /api/stats` - Statistiche
- `GET /api/activity-logs` - Log attività

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot, analisi documenti, ricerca semantica (Emergent LLM Key)
- **Brevo**: Email transazionali (sib-api-v3-sdk)

## Database Schema (Aggiornato)
- **users**: `{id, email, password, full_name, phone, codice_fiscale, nie, nif, cif, indirizzo, citta, cap, provincia, iban, regime_fiscale, tipo_attivita, tipo_cliente, role, stato, lists[], created_at}`
- **client_lists**: `{id, name, description, color, created_at}`
- **documents**: `{id, title, description, category, client_id, file_name, file_name_original, file_data, file_type, ai_analysis, tags[], needs_verification, client_confidence, ...}`
- **deadlines**: `{id, title, due_date, category, priority, status, client_ids[], ...}`
- **notes**: `{id, client_id, content, visibility, ...}`
- **payslips**: `{id, client_id, title, month, year, file_path}`

## Next Tasks (Priorità)
1. **P2**: Scadenze ricorrenti con promemoria automatici settimanali
2. **P2**: Versioning documenti con storico modifiche
3. **P3**: Report esportabili (PDF/Excel)
4. **P3**: Sistema di audit trail completo

## Future Tasks
- Integrazione firma elettronica
- Integrazione WhatsApp Business
- Supporto multilingua (Italiano/Spagnolo)
- Dashboard mobile responsive avanzata
