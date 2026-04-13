# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 91 (13 Aprile 2026) - COMPLETATA ✅

**Wizard Compilazione Dichiarazione dei Redditi Guidato**

Implementato un sistema wizard completo che obbliga il cliente a compilare correttamente ogni sezione della dichiarazione.

**Funzionalità implementate:**

1. **Navigazione Sequenziale Obbligatoria**
   - Il cliente NON può saltare sezioni non completate
   - Lo stepper mostra stati: completata (✓), in corso (●), bloccata (grigio)
   - Progress bar percentuale (0% → 100%)
   - Pulsante "Conferma e Prosegui" per avanzare

2. **Opzione "Non Applicabile" per ogni sezione**
   - Box con messaggio specifico per sezione (es. "Non ho avuto canoni di locazione nel periodo fiscale")
   - Pulsante "Conferma: questa sezione non mi riguarda"
   - Badge "Non applicabile" visibile nel riepilogo
   - Possibilità di modificare la scelta

3. **Auto-save Automatico**
   - Salvataggio automatico dopo 1.5 secondi di inattività
   - Toast discreto "Salvato automaticamente"
   - Nessun rischio di perdere dati

4. **Stati Sezione Visibili**
   - `not_started` (🔴 Da compilare)
   - `in_progress` (🟡 In compilazione)
   - `completed` (🟢 Completata e salvata)
   - `not_applicable` (⚪ Non applicabile)

5. **Riepilogo Finale con Controllo Completezza**
   - Lista tutte le sezioni con relativi stati
   - Blocca l'invio se anche solo una sezione è incompleta
   - Mostra messaggio chiaro se mancano sezioni

6. **Firma Obbligatoria Finale**
   - Checkbox consenso con testo legale completo
   - Canvas per firma digitale (disegno con mouse/dito)
   - Pulsante "Cancella" per rifare la firma
   - Blocco invio senza firma E consenso

**Sezioni del Wizard:**
1. Introduzione (istruzioni)
2. Dati Personali (obbligatori, non saltabili)
3. Situazione Familiare
4. Redditi da Lavoro
5. Lavoro Autonomo
6. Immobili
7. Canoni Locazione
8. Affitto Pagato
9. Investimenti
10. Criptomonete
11. Plusvalenze
12. Spese Deducibili
13. Deduzioni Canarie
14. Documenti
15. Riepilogo
16. Firma e Invio

**File modificati/creati:**
- `/app/frontend/src/components/TaxReturnFormWizard.jsx` (NUOVO - 2155 linee)
- `/app/frontend/src/pages/DeclarationsPage.jsx` (import aggiornato)
- `/app/backend/routes/declarations.py` (aggiunto `section_statuses` alle sezioni valide)
- `/app/backend/routes/declaration_models.py` (aggiunto campo `section_statuses`)

**Test eseguiti:**
- ✅ Backend: 13/13 test passati (100%)
- ✅ Frontend: Tutti i flussi wizard verificati (100%)
- ✅ API `PUT /api/declarations/tax-returns/{id}/sections/section_statuses` funzionante

---

### Fase 90 (13 Aprile 2026) - COMPLETATA ✅

**Investigazione Bug P0: Admin non vede dati dichiarazioni**

- Tracciato flusso completo: TaxReturnForm → PUT API → MongoDB → GET API → DeclarationDetailView
- **Conclusione:** Sistema funzionante correttamente. Le dichiarazioni esistenti erano vuote perché il cliente non aveva salvato i dati prima di inviare.
- **Raccomandazione implementata:** Wizard obbliga ora a completare tutte le sezioni prima dell'invio.

---

### Fase 89 (12 Dicembre 2025) - COMPLETATA ✅

**Piano Hardening Mobile App (primi 5 punti):**
- ThemeProvider integrato in App.tsx
- Dark Mode funzionante
- Tab Badges per scadenze e messaggi
- Skeleton Loading su tutte le schermate
- Biometric auto-login

---

## Prioritized Backlog

### P0 - Critico
- ✅ RISOLTO: Wizard compilazione dichiarazioni obbligatorio

### P1 - In Progress
- **Piano Hardening Mobile (punti rimanenti):**
  - Punto 6: Global Search
  - Punto 7: Dashboard Widgets
  - Punto 10: Gesture Navigation  
  - Punto 11: AI Assistant chat

- **Refactoring server.py:**
  - Spostare ~38 endpoint client in routes/clients.py
  - File attuale: ~6800 righe

### P2 - Future
- Integrazione firma digitale Namirial/Aruba
- Integrazione Dropbox/Google Drive per sync documenti
- Reminder automatico per dichiarazioni incomplete

### P3 - Backlog
- App Desktop Windows (Electron o simile)
- Dashboard Analytics e Reporting per Admin
- Offline Mode completo per mobile

---

## Code Architecture

```
/app/
├── backend/
│   ├── scheduler.py (APScheduler per cron jobs)
│   ├── email_service.py (Brevo integration)
│   ├── push_service.py (Push notifications)
│   ├── security.py (Rate limiting, audit)
│   ├── server.py (~6800 lines - needs refactoring)
│   └── routes/
│       ├── declarations.py ✅ (Refactored, section_statuses added)
│       ├── declaration_models.py ✅ (section_statuses field added)
│       ├── auth.py ✅
│       ├── clients.py (Placeholder)
│       └── ...
├── frontend/ (Web Admin/Client)
│   ├── src/components/TaxReturnFormWizard.jsx ✅ (NEW)
│   ├── src/components/TaxReturnForm.jsx (legacy, kept for reference)
│   ├── src/components/DeclarationDetailView.jsx
│   ├── src/pages/DeclarationsPage.jsx ✅ (updated import)
│   └── ...
└── mobile-app/
    └── fiscal-tax-mobile/
        └── ...
```

---

## Key API Endpoints (Declarations)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/declarations/tax-returns` | GET | Lista dichiarazioni |
| `/api/declarations/tax-returns` | POST | Crea nuova dichiarazione |
| `/api/declarations/tax-returns/{id}` | GET | Dettaglio dichiarazione |
| `/api/declarations/tax-returns/{id}/sections/{name}` | PUT | Salva sezione dati |
| `/api/declarations/tax-returns/{id}/sections/section_statuses` | PUT | **NEW** Salva stati sezioni |
| `/api/declarations/tax-returns/{id}/status` | PUT | Cambia stato |
| `/api/declarations/tax-returns/{id}/sign` | POST | Firma autorizzazione |

---

## Test Credentials

- **Admin:** francesco@fiscaltaxcanarie.com / Lanzarote1
- **Client:** test_commercialista_202642@example.com / TestCliente123!

---

## Test Reports

- `/app/test_reports/iteration_39.json` - Wizard tests (100% passed)
- `/app/backend/tests/test_wizard_iteration39.py` - Backend pytest

---

## 3rd Party Integrations

- **Brevo/Sendinblue:** Email notifications
- **Expo/EAS:** Mobile app builds
- **Apple App Store:** iOS distribution
- **OpenAI/Gemini:** AI Assistant (Emergent LLM Key)
- **APScheduler:** Cron jobs for deadline reminders
