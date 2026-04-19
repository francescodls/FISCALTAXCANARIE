# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 95 (19 Aprile 2026) - COMPLETATA ✅

**Dashboard Admin Dichiarazioni dei Redditi v2**

Implementata dashboard completa per la gestione amministrativa delle dichiarazioni con:

1. **Lista Completa Dichiarazioni**:
   - Nome cliente, email, ragione sociale
   - Anno fiscale
   - Stato con badge colorato
   - Percentuale completamento con barra visuale
   - Numero documenti allegati
   - Data creazione e ultima modifica
   - Pulsante "Apri" per dettaglio

2. **Ricerca Avanzata**:
   - Campo ricerca per nome, cognome, ragione sociale, codice fiscale, email
   - Filtro per stato pratica (7 opzioni)
   - Filtro per anno fiscale
   - Badge filtri attivi con rimozione rapida

3. **Stats Cards Interattive**:
   - Totale dichiarazioni
   - Da Revisionare (inviate)
   - In Revisione
   - Doc. Incompleta
   - Presentate
   - Click su card filtra automaticamente

4. **Modal Dettaglio Pratica** con 4 tabs:
   - **Panoramica**: ID pratica, date, progresso compilazione, dati cliente, firma
   - **Sezioni (14)**: Visualizzazione tutti i dati compilati dal cliente
   - **Messaggi**: Cronologia comunicazioni, invio nuovi messaggi, richiesta integrazione
   - **Gestione Stato**: 7 stati con colori/icone, campo nota opzionale

5. **Stati Dichiarazione**:
   - Bozza (giallo) - Cliente sta compilando
   - Inviata (blu) - In attesa revisione
   - Doc. Incompleta (arancione) - Richiesta integrazione
   - In Revisione (viola) - In elaborazione
   - Pronta (verde chiaro) - Per presentazione
   - Presentata (verde) - Completata
   - Rifiutata (rosso) - Non corretta

**File modificati:**
- `/app/frontend/src/pages/AdminDeclarationsPage.jsx` - Dashboard completa
- `/app/backend/routes/declarations_v2.py` - API con filtri avanzati

**Test eseguiti:**
- ✅ Backend: 11/14 test passati
- ✅ Frontend: Tutti i flussi critici verificati (100%)
- `/app/test_reports/iteration_41.json`

---

### Fase 94 (19 Aprile 2026) - COMPLETATA ✅

**Wizard Dichiarazioni v2 - Flusso Cliente**

- 14 sezioni specifiche con campi dettagliati
- Checkbox "Non ho questa tipologia"
- Auto-save con debounce 1.5s
- Firma Canvas (react-signature-canvas)
- Validazione firma (50% completamento + termini)
- Compatibilità mobile

---

### Fasi Precedenti

- Fase 93: Fix rifiuto App Store Apple (Guideline 4 Design)
- Fase 92: Fix notifiche Push + Email
- Fase 91: Rimozione vecchia sezione Dichiarazioni

---

## Prioritized Backlog

### P0 - Critico
- ✅ COMPLETATO: Wizard cliente Dichiarazioni v2
- ✅ COMPLETATO: Dashboard Admin Dichiarazioni v2

### P1 - Prossimi Task
- **Interfaccia Mobile Dichiarazioni v2** - Allineare app React Native
- **Sistema notifiche** push + email per cambio stato dichiarazione
- **Upload documenti** funzionale nella sezione "Documenti Allegati"
- **Aggiungere IP server a whitelist Brevo**: `104.198.214.223`

### P2 - Future
- Piano Hardening Mobile (punti 6,7,10,11)
- Refactoring server.py
- Integrazione firma digitale Namirial/Aruba

### P3 - Backlog
- App Desktop Windows
- Dashboard Analytics Admin
- Offline Mode mobile

---

## Code Architecture

```
/app/
├── backend/
│   └── routes/
│       └── declarations_v2.py ✅ (API complete con filtri avanzati)
├── frontend/
│   └── src/pages/
│       ├── ClientDeclarationsPage.jsx ✅
│       ├── DeclarationWizard.jsx ✅ 
│       └── AdminDeclarationsPage.jsx ✅ (Dashboard completa)
└── mobile-app/
    └── fiscal-tax-mobile/
        └── src/screens/ (da allineare con V2)
```

---

## Key API Endpoints (Declarations V2)

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/declarations/v2/declarations` | GET | Lista cliente |
| `/api/declarations/v2/declarations` | POST | Crea nuova |
| `/api/declarations/v2/declarations/{id}` | GET | Dettaglio |
| `/api/declarations/v2/declarations/{id}/section` | PUT | Auto-save |
| `/api/declarations/v2/declarations/{id}/sign` | POST | Firma |
| `/api/declarations/v2/declarations/{id}/submit` | POST | Invia |
| `/api/declarations/v2/declarations/{id}/messages` | GET/POST | Messaggi |
| `/api/declarations/v2/admin/declarations` | GET | Lista admin (filtri) |
| `/api/declarations/v2/admin/declarations/{id}/status` | PUT | Cambio stato |
| `/api/declarations/v2/admin/stats` | GET | Statistiche |

---

## Test Credentials

- **Admin:** francesco@fiscaltaxcanarie.com / Lanzarote1
- **Client:** test_commercialista_202642@example.com / TestCliente123!

---

## Test Reports

- `/app/test_reports/iteration_41.json` - Admin Dashboard (100% frontend, 79% backend)
- `/app/test_reports/iteration_40.json` - Wizard Cliente (100% passed)
