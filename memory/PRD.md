# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

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
1. **P1**: Refactoring `server.py` (~5600+ righe) in moduli separati (APIRouter per risorsa)
2. **P1**: Refactoring `ClientDetail.jsx` (>2900 righe) in sotto-componenti
3. **P1**: Refactoring `CommercialDashboard.jsx` (>1900 righe) in sotto-componenti
4. **P1**: Completare traduzione testi UI usando `t()` function (IT/EN/ES)

## Future Tasks (P2-P3)
- P2: Integrazione Dropbox (in attesa risposta utente)
- P2: App desktop (Electron) o mobile (React Native/Expo)
- P2: Migrazione file esistenti da MongoDB a Backblaze B2
- P3: WhatsApp Business Integration
- P3: Promemoria automatici schedulati (cron job)
- P3: Report esportabili PDF
- P3: Versioning documenti con storico modifiche
