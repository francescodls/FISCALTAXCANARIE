# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 96 (19 Aprile 2026) - COMPLETATA ✅

**Sistema Documenti, Comunicazioni, Notifiche e Download**

Implementato sistema completo per la gestione documentale delle dichiarazioni:

1. **Upload Documenti Lato Cliente**:
   - Formati supportati: PDF, JPG, JPEG, PNG
   - Max 10MB per file
   - Drag & drop + click per selezionare
   - Upload permesso solo in stato "bozza" o "documentazione_incompleta"
   - Visualizzazione lista documenti caricati con download/elimina

2. **Gestione Documenti Lato Admin**:
   - Tab "Documenti" nel dettaglio pratica
   - Anteprima immagini inline
   - Download singolo documento
   - Selezione multipla documenti
   - Upload documenti da admin

3. **Download PDF Riepilogativo**:
   - Genera PDF con tutti i dati compilati (reportlab)
   - Include: info pratica, tutte le 14 sezioni, firma
   - Nome file: `dichiarazione_{anno}_{cliente}.pdf`

4. **Download ZIP Pratica Completa**:
   - Contiene: `riepilogo_dichiarazione.pdf` + cartella `allegati/`
   - Include tutti i documenti caricati
   - Nome file: `pratica_{anno}_{cliente}.zip`

5. **Messaggi con Allegati**:
   - Admin può inviare messaggi con file allegato
   - Richiesta integrazione → cambia stato a "documentazione_incompleta"
   - Counter richieste pendenti

6. **Notifiche Push + Email**:
   - Invio automatico su richiesta integrazione
   - Invio automatico su cambio stato
   - Email HTML formattata con colori stato

**API implementate:**
- `POST /api/declarations/v2/declarations/{id}/documents` - Upload
- `GET /api/declarations/v2/declarations/{id}/documents` - Lista
- `DELETE /api/declarations/v2/declarations/{id}/documents/{doc_id}` - Elimina
- `GET /api/declarations/v2/admin/declarations/{id}/pdf` - Download PDF
- `GET /api/declarations/v2/admin/declarations/{id}/zip` - Download ZIP
- `POST /api/declarations/v2/declarations/{id}/messages/with-attachment`
- `PUT /api/declarations/v2/admin/declarations/{id}/status-notify`

**Test eseguiti:**
- ✅ Backend: 15/15 test passati (100%)
- ✅ Frontend: Tutti i flussi verificati (100%)
- `/app/test_reports/iteration_42.json`

---

### Fase 95 (19 Aprile 2026) - COMPLETATA ✅

**Dashboard Admin Dichiarazioni v2**
- Lista completa con nome, ragione sociale, anno, stato, date, documenti
- Ricerca avanzata per nome/cognome/CF/email/ragione sociale
- Filtri per stato e anno
- Modal dettaglio con 5 tabs (Panoramica, Sezioni, Documenti, Messaggi, Gestione Stato)
- 7 stati con colori e icone

---

### Fase 94 (19 Aprile 2026) - COMPLETATA ✅

**Wizard Dichiarazioni v2 - Flusso Cliente**
- 14 sezioni specifiche con campi dettagliati
- Toggle "Non applicabile" per ogni sezione
- Auto-save con debounce 1.5s
- Firma Canvas (react-signature-canvas)
- Compatibilità mobile

---

## Prioritized Backlog

### P0 - Critico
- ✅ COMPLETATO: Wizard cliente Dichiarazioni v2
- ✅ COMPLETATO: Dashboard Admin Dichiarazioni v2
- ✅ COMPLETATO: Sistema documenti, comunicazioni, notifiche, download

### P1 - Prossimi Task
- **Interfaccia Mobile Dichiarazioni v2** - Allineare app React Native
- **Aggiungere IP server a whitelist Brevo**: `104.198.214.223` (per email funzionanti)

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
│       └── declarations_v2.py ✅ (API complete: CRUD, documenti, PDF, ZIP, notifiche)
│   └── uploads/declarations/ (Storage documenti)
├── frontend/
│   └── src/pages/
│       ├── ClientDeclarationsPage.jsx ✅
│       ├── DeclarationWizard.jsx ✅ (Upload documenti funzionante)
│       └── AdminDeclarationsPage.jsx ✅ (Tab Documenti con PDF/ZIP)
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
| `/api/declarations/v2/declarations/{id}/documents` | GET/POST/DELETE | Documenti |
| `/api/declarations/v2/declarations/{id}/messages` | GET/POST | Messaggi |
| `/api/declarations/v2/declarations/{id}/messages/with-attachment` | POST | Messaggio+file |
| `/api/declarations/v2/admin/declarations` | GET | Lista admin |
| `/api/declarations/v2/admin/declarations/{id}/status` | PUT | Cambio stato |
| `/api/declarations/v2/admin/declarations/{id}/status-notify` | PUT | Stato+notifica |
| `/api/declarations/v2/admin/declarations/{id}/pdf` | GET | Download PDF |
| `/api/declarations/v2/admin/declarations/{id}/zip` | GET | Download ZIP |
| `/api/declarations/v2/admin/stats` | GET | Statistiche |

---

## Test Credentials

- **Admin:** francesco@fiscaltaxcanarie.com / Lanzarote1
- **Client:** test_commercialista_202642@example.com / TestCliente123!

---

## Known Issues

1. **Email Brevo 401 Error:** IP server da aggiungere a whitelist Brevo
   - IP: `104.198.214.223`
   - URL: https://app.brevo.com/security/authorised_ips

---

## Test Reports

- `/app/test_reports/iteration_42.json` - Documenti/PDF/ZIP (100% passed)
- `/app/test_reports/iteration_41.json` - Admin Dashboard (100%)
- `/app/test_reports/iteration_40.json` - Wizard Cliente (100%)
