# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 94 (19 Aprile 2026) - COMPLETATA ✅

**Wizard Dichiarazioni dei Redditi v2 - Flusso Cliente Completo**

Implementato il nuovo sistema guidato per la compilazione delle dichiarazioni dei redditi con:

1. **14 Sezioni Specifiche**:
   - Dati Personali (nome, cognome, CF/NIE, residenza, contatti)
   - Situazione Familiare (stato civile, figli, familiari a carico)
   - Redditi da Lavoro (dipendente, pensione, CU)
   - Redditi Autonomo (P.IVA, regime fiscale, fatturato)
   - Immobili (proprietà, valore catastale, ubicazione)
   - Canoni di Locazione (affitti percepiti/pagati)
   - Plusvalenze (vendita immobili/partecipazioni)
   - Investimenti Finanziari (azioni, fondi, obbligazioni)
   - Criptomonete (possesso, vendite, exchange)
   - Spese Deducibili (mediche, interessi, assicurazioni)
   - Deduzioni/Agevolazioni (bonus ristrutturazione, ecobonus)
   - Documenti Allegati
   - Note Aggiuntive
   - Autorizzazione e Firma

2. **Funzionalità Implementate**:
   - ✅ Checkbox "Non ho questa tipologia" per ogni sezione
   - ✅ Auto-save con debounce 1.5 secondi
   - ✅ Percentuale completamento dinamica
   - ✅ Navigazione step-by-step (Precedente/Successivo)
   - ✅ Firma Canvas con react-signature-canvas (mouse + touch)
   - ✅ Validazione: firma richiede 50% completamento + accettazione termini
   - ✅ Compatibilità mobile (responsive design)

**File modificati/creati:**
- `/app/frontend/src/pages/DeclarationWizard.jsx` - Wizard completo
- `/app/frontend/src/pages/ClientDeclarationsPage.jsx` - Fix import

**Test eseguiti:**
- ✅ Backend: 13/13 test passati (100%)
- ✅ Frontend: Tutti i flussi verificati (100%)
- `/app/test_reports/iteration_40.json`

---

### Fase 93 (Dicembre 2025) - COMPLETATA ✅

**Fix Rifiuto App Store Apple - Guideline 4 Design**

- Creato `RegisterScreen.tsx` (form nativo registrazione)
- Creato `ForgotPasswordScreen.tsx` (recupero password nativo)
- Aggiornato `LoginScreen.tsx` (navigazione nativa, no browser esterno)
- Aggiunto endpoint account deletion in-app

---

### Fasi Precedenti

- Fase 92: Fix notifiche dichiarazione Push + Email
- Fase 91: Rimozione completa vecchia sezione Dichiarazioni (bug postMessage)
- Fase 90: Creazione macrostruttura Dichiarazioni v2

---

## Prioritized Backlog

### P0 - Critico
- ✅ COMPLETATO: Wizard Dichiarazioni v2 lato cliente

### P1 - Prossimi Task
- **Dashboard Admin Dichiarazioni v2** - Visualizzazione pratiche, cambio stato, richieste integrazione
- **Interfaccia Mobile Dichiarazioni v2** - Allineare app mobile con flusso web
- **Sistema notifiche admin-cliente** per dichiarazioni v2
- **Aggiungere IP server a whitelist Brevo**: `104.198.214.223`

### P2 - Piano Hardening Mobile
- Punto 6: Global Search
- Punto 7: Dashboard Widgets
- Punto 10: Gesture Navigation
- Punto 11: AI Assistant chat
- Refactoring server.py in router separati

### P3 - Backlog
- Integrazione firma digitale Namirial/Aruba
- App Desktop Windows
- Dashboard Analytics Admin
- Offline Mode mobile

---

## Code Architecture

```
/app/
├── backend/
│   ├── server.py
│   └── routes/
│       ├── declarations.py (deprecata)
│       └── declarations_v2.py ✅ (API V2 complete)
├── frontend/
│   └── src/pages/
│       ├── ClientDeclarationsPage.jsx ✅
│       ├── DeclarationWizard.jsx ✅ (Wizard 14 sezioni)
│       └── AdminDeclarationsPage.jsx (da completare)
└── mobile-app/
    └── fiscal-tax-mobile/
        └── src/screens/ (da allineare con V2)
```

---

## Key API Endpoints (Declarations V2)

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/declarations/v2/declarations` | GET | Lista dichiarazioni cliente |
| `/api/declarations/v2/declarations` | POST | Crea nuova dichiarazione |
| `/api/declarations/v2/declarations/{id}` | GET | Dettaglio con 14 sezioni |
| `/api/declarations/v2/declarations/{id}/section` | PUT | Auto-save sezione |
| `/api/declarations/v2/declarations/{id}/sign` | POST | Firma dichiarazione |
| `/api/declarations/v2/declarations/{id}/submit` | POST | Invia dichiarazione |
| `/api/declarations/v2/declarations/{id}/messages` | GET/POST | Messaggi pratica |
| `/api/declarations/v2/admin/declarations` | GET | Lista admin con filtri |
| `/api/declarations/v2/admin/declarations/{id}/status` | PUT | Cambio stato admin |

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

- `/app/test_reports/iteration_40.json` - Wizard V2 tests (100% passed)
- `/app/test_reports/iteration_39.json` - Previous wizard tests
