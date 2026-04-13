# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 90 (13 Aprile 2026) - COMPLETATA ✅

**Investigazione Bug P0: Admin non vede dati dichiarazioni clienti**

**Problema segnalato:** L'amministratore non riusciva a visualizzare i dati delle Dichiarazioni dei Redditi compilati dai clienti nel pannello admin.

**Investigazione effettuata:**
1. Analizzato il flusso dati completo:
   - `TaxReturnForm.jsx` (client) → salva dati tramite `PUT /api/declarations/tax-returns/{id}/sections/{section_name}`
   - `declarations.py` (backend) → persiste in MongoDB con `$set: {section_name: data}`
   - `GET /api/declarations/tax-returns/{id}` → recupera dati dal DB
   - `DeclarationDetailView.jsx` (admin) → visualizza con `renderSectionData()`

2. Test API E2E:
   - Creato dati di test: `PUT .../sections/datos_personales` con nome "Mario Rossi"
   - Verificato salvataggio: API ritorna `{"message":"Sezione datos_personales aggiornata"}`
   - Verificato recupero come cliente: dati presenti nella risposta GET
   - Verificato recupero come admin: dati identici visibili

3. Test Frontend:
   - Screenshot del pannello admin → i dati di "Mario Rossi" sono visibili nel tab "Dati Inseriti"
   - La sezione "Situazione Familiare" mostra correttamente "Non compilato" per sezioni vuote

**Conclusione:** Il sistema funziona correttamente! 
- Le dichiarazioni esistenti (es. 2025 "inviata") non contenevano dati perché il cliente non li aveva mai salvati prima di inviare
- NON è un bug del codice, ma dati di test/produzione vuoti
- Il flusso backend e frontend è stato verificato come funzionante

**Raccomandazione:** Aggiungere validazione lato client per impedire l'invio di pratiche completamente vuote, oppure mostrare un avviso all'admin quando una pratica inviata ha sezioni vuote.

---

### Fase 89 (12 Dicembre 2025) - COMPLETATA ✅

**Completamento Piano Hardening Mobile App (11 Punti):**

**Modifiche implementate:**

1. **ThemeProvider integrato in App.tsx:**
   - Context provider per dark mode wrappato correttamente nell'albero dei componenti
   - Ordine: GestureHandler → SafeArea → Network → Theme → Language → Auth → Navigator

2. **Tab Badges funzionanti:**
   - Badge scadenze (warning color) sulla tab "Scadenze" 
   - Badge messaggi non letti sulla tab "Comunicazioni"
   - Stili badge aggiunti al StyleSheet di AppNavigator

3. **Skeleton Loading su tutte le schermate principali:**
   - DocumentsScreen: DocumentSkeleton durante caricamento
   - CalendarScreen: Skeleton calendario + CardSkeleton per scadenze
   - CommunicationsScreen: CardSkeleton durante caricamento

4. **Sezione Tema in ProfileScreen:**
   - Toggle per Light/Dark/Auto mode
   - Icone Sun/Moon/Monitor per le opzioni
   - Persistenza preferenza via SecureStore

5. **Traduzioni completate:**
   - IT: seeAll, appearance, themeLight, themeDark, themeAuto
   - EN: seeAll, appearance, themeLight, themeDark, themeAuto
   - ES: seeAll, appearance, themeLight, themeDark, themeAuto

**File modificati:**
- `/app/mobile-app/fiscal-tax-mobile/App.tsx` - Aggiunto ThemeProvider
- `/app/mobile-app/fiscal-tax-mobile/src/navigation/AppNavigator.tsx` - Tab badges + stili
- `/app/mobile-app/fiscal-tax-mobile/src/screens/DocumentsScreen.tsx` - Skeleton loading
- `/app/mobile-app/fiscal-tax-mobile/src/screens/CalendarScreen.tsx` - Skeleton loading
- `/app/mobile-app/fiscal-tax-mobile/src/screens/CommunicationsScreen.tsx` - Skeleton loading
- `/app/mobile-app/fiscal-tax-mobile/src/screens/ProfileScreen.tsx` - Sezione tema
- `/app/mobile-app/fiscal-tax-mobile/src/i18n/it.ts` - Traduzioni tema
- `/app/mobile-app/fiscal-tax-mobile/src/i18n/en.ts` - Traduzioni tema
- `/app/mobile-app/fiscal-tax-mobile/src/i18n/es.ts` - Traduzioni tema

**Test eseguiti:**
- ✅ Backend API verification (iteration_38): tutte le API funzionanti
- ✅ Login client e admin OK
- ✅ Documenti, scadenze, notifiche, comunicazioni API OK

---

## Prioritized Backlog

### P0 - Critico
- ✅ RISOLTO: Bug visibilità dati dichiarazioni (era falso positivo - dati vuoti, non bug)

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
│       ├── declarations.py ✅ (Refactored)
│       ├── declaration_models.py
│       ├── auth.py ✅ (Refactored)
│       ├── clients.py (Placeholder - needs population)
│       ├── fees_routes.py
│       ├── deadline_types.py
│       ├── notifications.py
│       └── privacy_routes.py
├── frontend/ (Web Admin/Client)
│   ├── src/components/DeclarationDetailView.jsx
│   ├── src/components/TaxReturnForm.jsx
│   ├── src/components/AdminDeclarationsView.jsx
│   └── src/pages/DeclarationsPage.jsx
└── mobile-app/
    └── fiscal-tax-mobile/
        ├── App.tsx (with ThemeProvider)
        ├── app.json
        └── src/
            ├── hooks/useThemedColors.ts
            ├── context/ThemeContext.tsx
            ├── context/LanguageContext.tsx
            └── screens/
```

---

## Key API Endpoints (Declarations)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/declarations/tax-returns` | GET | Lista dichiarazioni |
| `/api/declarations/tax-returns` | POST | Crea nuova dichiarazione |
| `/api/declarations/tax-returns/{id}` | GET | Dettaglio dichiarazione |
| `/api/declarations/tax-returns/{id}/sections/{name}` | PUT | Salva sezione dati |
| `/api/declarations/tax-returns/{id}/status` | PUT | Cambia stato |
| `/api/declarations/tax-returns/{id}/sign` | POST | Firma autorizzazione |
| `/api/declarations/tax-returns/{id}/summary-pdf` | GET | PDF riepilogativo |
| `/api/declarations/tax-returns/{id}/download-all` | GET | ZIP allegati |

---

## Test Credentials

- **Admin:** francesco@fiscaltaxcanarie.com / Lanzarote1
- **Client:** test_commercialista_202642@example.com / TestCliente123!

---

## Known Issues

1. **Dichiarazione 2025 vuota:** La dichiarazione di test per il 2025 è stata "inviata" senza dati. Non è un bug - il cliente semplicemente non ha compilato i campi prima di inviare.

2. **Offline Mode:** Il `NetworkContext` esiste ma il caching locale non è completamente funzionale.

---

## 3rd Party Integrations

- **Brevo/Sendinblue:** Email notifications
- **Expo/EAS:** Mobile app builds
- **Apple App Store:** iOS distribution
- **OpenAI/Gemini:** AI Assistant (Emergent LLM Key)
- **APScheduler:** Cron jobs for deadline reminders
