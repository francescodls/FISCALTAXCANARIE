# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 92 (13 Aprile 2026) - COMPLETATA ✅

**Fix Notifiche Dichiarazione - Push + Email Obbligatori**

Problema: Quando l'admin inviava comunicazioni dalla sezione Dichiarazione, non arrivavano correttamente sia come push che come email.

**Soluzione implementata:**

1. **Creata funzione helper `send_declaration_notification()`**
   - Invia automaticamente PUSH + EMAIL al cliente
   - Gestisce errori separatamente per ciascun canale
   - Log dettagliati per debugging
   - Supporta extra_data per deep linking nell'app

2. **Endpoint aggiornati:**
   - `POST /api/declarations/tax-returns/{id}/messages` → Push + Email
   - `POST /api/declarations/tax-returns/{id}/integration-requests` → Push + Email  
   - `POST /api/declarations/tax-returns/{id}/fee/notify` → Push + Email

**File modificati:**
- `/app/backend/routes/declarations.py`

**Test eseguiti:**
- ✅ Invio messaggio conversazione: Push + Email tentati
- ✅ Richiesta integrazione: Push + Email tentati
- ✅ Log mostrano entrambe le notifiche partono simultaneamente

**Nota:** L'email richiede che l'IP del server (104.198.214.223) sia nella whitelist Brevo: https://app.brevo.com/security/authorised_ips

---

### Fase 91 (13 Aprile 2026) - COMPLETATA ✅

**Wizard Compilazione Dichiarazione dei Redditi Guidato**

- Navigazione sequenziale obbligatoria (non si possono saltare sezioni)
- Opzione "Non Applicabile" per ogni sezione
- Auto-save automatico con debounce 1.5s
- Stati sezione visibili (da compilare, in corso, completata, non applicabile)
- Firma finale obbligatoria (checkbox + canvas firma)
- Progress bar e stepper visivo

**File creati:**
- `/app/frontend/src/components/TaxReturnFormWizard.jsx`

---

### Fase 90 (13 Aprile 2026) - COMPLETATA ✅

**Investigazione Bug P0: Admin non vede dati dichiarazioni**

- Sistema funzionante correttamente
- Le dichiarazioni erano vuote perché il cliente non aveva salvato i dati
- Risolto con wizard obbligatorio

---

## Prioritized Backlog

### P0 - Critico
- ✅ RISOLTO: Notifiche dichiarazione push + email
- ✅ RISOLTO: Wizard compilazione dichiarazioni

### P1 - In Progress
- **Aggiungere IP server a whitelist Brevo** (azione utente): `104.198.214.223`
- **Piano Hardening Mobile (punti rimanenti):**
  - Punto 6: Global Search
  - Punto 7: Dashboard Widgets
  - Punto 10: Gesture Navigation  
  - Punto 11: AI Assistant chat

- **Refactoring server.py** (~38 endpoint client)

### P2 - Future
- Integrazione firma digitale Namirial/Aruba
- Integrazione Dropbox/Google Drive
- Reminder automatico dichiarazioni incomplete

### P3 - Backlog
- App Desktop Windows
- Dashboard Analytics Admin
- Offline Mode mobile

---

## Code Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── declarations.py ✅ (send_declaration_notification helper added)
│   │   └── ...
│   ├── push_service.py
│   ├── email_service.py
│   └── ...
├── frontend/
│   ├── src/components/
│   │   ├── TaxReturnFormWizard.jsx ✅ (NEW)
│   │   └── ...
│   └── ...
└── mobile-app/
    └── ...
```

---

## Key API Endpoints (Declarations with Notifications)

| Endpoint | Notifications |
|----------|---------------|
| `POST .../messages` | ✅ Push + Email |
| `POST .../integration-requests` | ✅ Push + Email |
| `POST .../fee/notify` | ✅ Push + Email |

---

## Test Credentials

- **Admin:** francesco@fiscaltaxcanarie.com / Lanzarote1
- **Client:** test_commercialista_202642@example.com / TestCliente123!

---

## Known Issues

1. **Email Brevo 401 Error:** L'IP del server deve essere aggiunto alla whitelist Brevo
   - IP: `104.198.214.223`
   - URL: https://app.brevo.com/security/authorised_ips

---

## Test Reports

- `/app/test_reports/iteration_39.json` - Wizard tests (100% passed)
