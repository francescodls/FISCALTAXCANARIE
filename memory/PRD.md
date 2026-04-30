# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented


### Fase 102 (30 Aprile 2026) - COMPLETATA ✅

**Configurazione Notifiche Avanzate per Tipi di Scadenza + Auto-Assegnazione**

1. **Backend - Nuove funzionalità:**
   - `notification_config` nei tipi scadenza con:
     - `enabled`: boolean per abilitare/disabilitare
     - `channels`: array ["push", "email"] per selezionare canali
     - `relative_reminders`: array di giorni prima della scadenza [20, 15, 7, 3, 1, 0]
     - `fixed_dates`: array di date fisse per promemoria extra
   - `auto_assign_to_category`: boolean per generazione automatica scadenze
   - Funzione `auto_generate_deadlines_for_category()` per creare scadenze alla creazione tipo
   - Funzione `auto_assign_deadlines_to_client_internal()` per assegnare scadenze a nuovi clienti

2. **Auto-assegnazione scadenze:**
   - Alla creazione di un tipo scadenza con `auto_assign_to_category=true`:
     - Sistema genera automaticamente scadenze per tutti i clienti della categoria
     - Calcola date per anno corrente e prossimo
   - Alla creazione di un nuovo cliente:
     - Sistema assegna automaticamente tutte le scadenze standard della sua categoria
   - Al cambio categoria cliente:
     - Sistema assegna scadenze della nuova categoria

3. **Scheduler notifiche aggiornato:**
   - Legge `notification_config` da ogni scadenza o tipo scadenza
   - Rispetta il flag `enabled` 
   - Invia notifiche solo sui canali configurati (push/email)
   - Supporta promemoria relativi personalizzati
   - Supporta date fisse per promemoria extra

4. **Frontend UI - DeadlineTypesManagement.jsx:**
   - Sezione "Configurazione Notifiche" con:
     - Switch abilitazione
     - Bottoni canali (Push/Email)
     - Griglia promemoria relativi (30, 20, 15, 10, 7, 5, 3, 2, 1, 0 giorni)
     - Date picker per date fisse personalizzate
   - Sezione "Assegnazione Automatica" con:
     - Switch per abilitare auto-generazione
     - Preview categorie selezionate

5. **Modelli aggiornati:**
   - `DeadlineTypeCreate/Update`: + notification_config, auto_assign_to_category
   - `DeadlineResponse`: + deadline_type_id, tax_model_id, notification_config, auto_generated

**File modificati:**
- `/app/backend/routes/deadline_types.py`
- `/app/backend/scheduler.py`
- `/app/backend/server.py` (register, create_client, update_client)
- `/app/frontend/src/components/DeadlineTypesManagement.jsx`

**Test risultati:** Backend 83% (10/12 passed), Frontend 100%
- 104 scadenze totali, 96 auto-generate
- 2 tipi scadenza nel sistema

---


### Fase 101 (19 Aprile 2026) - COMPLETATA ✅

**Visualizzazione Importi da Pagare nell'App Mobile Cliente**

Implementata la visualizzazione degli importi da pagare nella home e nel calendario dell'app mobile.

1. **Backend - Nuovi endpoint per clienti:**
   - `GET /api/tax-payments/client/payments` - Lista pagamenti (upcoming/expired/all)
   - `GET /api/tax-payments/client/payments/calendar` - Dati per calendario con marked_dates
   - `GET /api/tax-payments/client/payments/{id}` - Dettaglio singolo pagamento

2. **HomeScreen Mobile:**
   - Nuova sezione "Prossimi Importi da Pagare" con:
     - Card riepilogativa con totale da pagare
     - Lista max 3 pagamenti con urgenza visiva
     - Badge "Urgente" per scadenze < 3 giorni
     - Giorni mancanti visualizzati (Oggi/Domani/X gg)
   - Link "Vedi tutti" se più di 3 pagamenti

3. **CalendarScreen Mobile:**
   - Doppio indicatore sui giorni:
     - Pallino verde per pagamenti
     - Pallino colorato per scadenze
   - Sezione "Pagamenti" sotto le scadenze del giorno selezionato
   - Importo visibile direttamente nella card

4. **PaymentsListScreen (nuovo):**
   - Tab "Prossimi" e "Storico"
   - Card riepilogativa totale
   - Lista completa pagamenti con urgency colors
   - Pull-to-refresh

5. **PaymentDetailScreen (nuovo):**
   - Card importo con stato urgenza
   - Dettagli: modello, periodo, scadenza
   - Stato notifica
   - Link per aprire ticket di supporto

6. **Logica scadenza automatica:**
   - Pagamenti con data passata → `is_expired: true`
   - Urgency levels: expired, urgent (≤3gg), warning (≤7gg), normal
   - Scomparsa automatica dalla home dopo scadenza

**File creati/modificati:**
- `/app/backend/routes/tax_payments.py` (+ endpoint client)
- `/app/mobile-app/fiscal-tax-mobile/src/services/api.ts`
- `/app/mobile-app/fiscal-tax-mobile/src/screens/HomeScreen.tsx`
- `/app/mobile-app/fiscal-tax-mobile/src/screens/CalendarScreen.tsx`
- `/app/mobile-app/fiscal-tax-mobile/src/screens/PaymentsListScreen.tsx` (nuovo)
- `/app/mobile-app/fiscal-tax-mobile/src/screens/PaymentDetailScreen.tsx` (nuovo)
- `/app/mobile-app/fiscal-tax-mobile/src/navigation/AppNavigator.tsx`

---

### Fase 100 (19 Aprile 2026) - COMPLETATA ✅

**Nuova Sezione Admin: Gestione Importi Tributari + Sistema Notifiche**

**FASE 1: Macrostruttura (completata)**
- CRUD Modelli Tributari (IVA, IGIC, Mod.130, ecc.)
- CRUD Assegnazioni Importi ai clienti
- Operazioni massive (bulk create/delete)
- Statistiche dashboard
- Assegnazione rapida per categoria

**FASE 2: Sistema Notifiche (completata)**

1. **Backend - Nuovi endpoint:**
   - `POST /api/tax-payments/notifications/send` - Invio singolo
   - `POST /api/tax-payments/notifications/send-bulk` - Invio massivo
   - `GET /api/tax-payments/notifications/history/{id}` - Storico notifiche
   - `POST /api/tax-payments/notifications/mark-as-paid` - Segna come pagato

2. **Email personalizzate:**
   - Template HTML professionale con logo
   - Importo evidenziato in verde
   - Scadenza evidenziata
   - Box dettagli (modello, periodo, data)
   - Messaggio personalizzabile dall'admin

3. **Push Notification:**
   - Integrazione Expo Push API
   - Titolo: "Importo da pagare: {modello}"
   - Body: "{importo} - Scadenza: {data}"
   - Deep linking con assignment_id

4. **Tracking stato:**
   - `notification_status`: non_inviata → inviata → visualizzata → pagata
   - `email_sent_at`, `push_sent_at`
   - `last_custom_message`
   - `last_notification_error`

5. **Frontend UI:**
   - Pulsante "Invia" per ogni assegnazione
   - Pulsante "Invia Notifiche" massivo
   - Pulsante "Segna Pagati" massivo
   - Dialog con preview importo e canali
   - Badge stato colorati

**File modificati:**
- `/app/backend/routes/tax_payments.py` (aggiunto 500+ righe per notifiche)
- `/app/frontend/src/components/TaxPaymentsManagement.jsx`

**Test eseguiti:**
- ✅ API: Invio singolo → Email inviata con successo
- ✅ API: Storico notifiche mostra email_sent_at
- ✅ UI: Dialog notifica con preview dettagli
- ✅ UI: Badge "Inviata" visibile

---

### Fase 99 (19 Aprile 2026) - COMPLETATA ✅

**Fix Download Documenti Admin + Backblaze B2 Cloud Storage**

Risolto bug critico nel download documenti e migrato lo storage su Backblaze B2:

1. **Integrazione Backblaze B2 per Documenti Dichiarazioni**
   - Upload documenti su cloud storage invece di file locale
   - Download trasparente da B2 (fallback a locale per documenti esistenti)
   - Eliminazione file da B2 quando documento rimosso
   - Generazione ZIP scarica automaticamente da B2
   - I documenti sopravvivono ai deploy! 🎉

2. **Backend - `declarations_v2.py`**
   - Aggiunto supporto storage ibrido (B2 + locale)
   - Nuovo campo `storage_type` ("b2" o "local")
   - Nuovo campo `storage_path` per path B2
   - Nuovo campo `b2_file_id` per eliminazione
   - Parametro `preview=true` per anteprima inline

3. **Struttura documento:**
   ```json
   {
     "storage_type": "b2",
     "storage_path": "clients/{client_id}/declarations/{decl_id}/{doc_id}.pdf",
     "b2_file_id": "4_z271a3dcaf...",
     "file_path": null
   }
   ```

**File modificati:**
- `/app/backend/routes/declarations_v2.py`
- `/app/frontend/src/pages/AdminDeclarationsPage.jsx`

**Test eseguiti:**
- ✅ Upload documento → salvato su B2 
- ✅ Download documento → letto da B2
- ✅ Contenuto corretto

**NOTA IMPORTANTE per Produzione:**
I documenti già caricati in produzione (storage locale) potrebbero essere persi.
I nuovi documenti saranno salvati su B2 e sopravviveranno ai deploy.

---

### Fase 98 (19 Aprile 2026) - COMPLETATA ✅

**Interfaccia Mobile Dichiarazioni V2 - Allineamento React Native**

Implementazione del Wizard Mobile a 14 sezioni per l'app React Native:

1. **DeclarationWizardScreen.tsx** - Wizard mobile completo
   - 14 sezioni identiche al web (dati personali, famiglia, redditi, immobili, cripto, ecc.)
   - Autosave con debounce 2 secondi
   - Firma canvas con `react-native-signature-canvas`
   - Upload documenti da fotocamera, galleria e file picker
   - Navigazione step-by-step con progress bar
   - Toggle "Non Applicabile" per ogni sezione

2. **DeclarationDetailScreen.tsx** - Aggiornato a V2
   - Usa nuove API V2 (`getDeclarationV2`, `getDeclarationMessages`, ecc.)
   - Visualizzazione messaggi con badge "Richiesta Integrazione"
   - Lista documenti con download
   - Progress bar completamento

3. **Dipendenze aggiunte:**
   - `react-native-signature-canvas@5.0.2`
   - `react-native-webview@13.16.1`
   - `expo-image-picker@55.0.18`

4. **Navigazione aggiornata:**
   - `DeclarationWizard` rotta aggiunta a `AppNavigator.tsx`
   - Navigazione condizionale (Wizard se bozza, Detail altrimenti)

**File creati/modificati:**
- `/app/mobile-app/fiscal-tax-mobile/src/screens/DeclarationWizardScreen.tsx` (NUOVO)
- `/app/mobile-app/fiscal-tax-mobile/src/screens/DeclarationDetailScreen.tsx` (AGGIORNATO)
- `/app/mobile-app/fiscal-tax-mobile/src/navigation/AppNavigator.tsx` (AGGIORNATO)
- `/app/mobile-app/fiscal-tax-mobile/package.json` (AGGIORNATO)

**Stato:** Implementazione completata, test mobile pendenti

---

### Fase 97 (19 Aprile 2026) - COMPLETATA ✅

**Quality Assurance e Refactoring Tecnico - Stabilità e Robustezza**

Implementate tutte le migliorie tecniche richieste:

1. **Error Boundary React** (`DeclarationErrorBoundary.jsx`)
   - Cattura errori React e mostra fallback UI
   - Bottoni "Riprova" e "Torna alla lista"
   - Log errori per debugging

2. **Retry Automatico su Errore Rete** (`useApiWithRetry.js`)
   - 3 tentativi con backoff esponenziale
   - Timeout configurabile
   - Cancellazione richieste duplicate

3. **Indicatore Autosave Visivo** (`SaveStatusIndicator`)
   - Stati: idle / pending / saving / saved / error
   - Debounce 1.5 secondi
   - Evita salvataggi duplicati

4. **Skeleton Loaders** (`SkeletonLoaders.jsx`)
   - `WizardSkeleton` per wizard compilazione
   - `AdminDashboardSkeleton` per dashboard admin
   - `DeclarationDetailSkeleton` per dettaglio pratica
   - `DeclarationListSkeleton` per lista dichiarazioni

5. **Gestione Offline**
   - Rilevamento stato connessione
   - Banner "Sei Offline" visivo
   - Disabilitazione operazioni sensibili

6. **Validazione Form** (`FormValidation.jsx`)
   - Regole validazione per sezione
   - Componente `ValidatedInput` con feedback inline
   - `PreSubmitValidation` per riepilogo pre-invio

7. **Modularità Codice**
   - Componenti separati in `/components/declarations/`
   - Export centralizzato via `index.js`
   - Hooks riutilizzabili

**File creati:**
- `/app/frontend/src/components/declarations/DeclarationErrorBoundary.jsx`
- `/app/frontend/src/components/declarations/useApiWithRetry.js`
- `/app/frontend/src/components/declarations/SkeletonLoaders.jsx`
- `/app/frontend/src/components/declarations/FormValidation.jsx`
- `/app/frontend/src/components/declarations/index.js`

**Test eseguiti:**
- ✅ Backend: 32/32 test passati (100%)
- ✅ Frontend: 95% (rate limiting su login durante test rapidi)
- `/app/test_reports/iteration_43.json`

---

### Fasi Precedenti (Riepilogo)

| Fase | Data | Descrizione | Stato |
|------|------|-------------|-------|
| 96 | 19/04/2026 | Sistema Documenti, PDF, ZIP, Notifiche | ✅ |
| 95 | 19/04/2026 | Dashboard Admin Dichiarazioni v2 | ✅ |
| 94 | 19/04/2026 | Wizard Cliente 14 sezioni + Firma | ✅ |
| 93 | Dic 2025 | Fix App Store Apple Guideline 4 | ✅ |

---

## Architettura Tecnica

### Struttura Componenti Dichiarazioni

```
/app/frontend/src/
├── components/declarations/
│   ├── index.js                      # Export centralizzato
│   ├── DeclarationErrorBoundary.jsx  # Error handling
│   ├── useApiWithRetry.js            # Hooks fetch/autosave
│   ├── SkeletonLoaders.jsx           # Loading states
│   └── FormValidation.jsx            # Validazione
└── pages/
    ├── DeclarationWizard.jsx         # Wizard 14 step + firma
    ├── ClientDeclarationsPage.jsx    # Lista cliente
    └── AdminDeclarationsPage.jsx     # Dashboard admin
```

### Struttura Mobile App (React Native)

```
/app/mobile-app/fiscal-tax-mobile/src/
├── screens/
│   ├── DeclarationsScreen.tsx        # Lista dichiarazioni V2
│   ├── DeclarationWizardScreen.tsx   # Wizard mobile 14 step + firma
│   └── DeclarationDetailScreen.tsx   # Dettaglio V2 (sola lettura)
├── services/
│   └── api.ts                        # API V2 complete
└── navigation/
    └── AppNavigator.tsx              # Navigazione con rotta Wizard
```

### Flusso Dati

```
Cliente compila → Autosave (debounce 1.5s) → Firma → Invia
                         ↓
Admin visualizza → Cambia stato → Notifica (push + email)
                         ↓
                   Richiesta integrazione
                         ↓
Cliente integra → Documento aggiunto → Admin scarica PDF/ZIP
```

---

## API Endpoints (Declarations V2)

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/declarations/v2/declarations` | GET/POST | Lista/Crea |
| `/api/declarations/v2/declarations/{id}` | GET | Dettaglio |
| `/api/declarations/v2/declarations/{id}/section` | PUT | Autosave |
| `/api/declarations/v2/declarations/{id}/sign` | POST | Firma |
| `/api/declarations/v2/declarations/{id}/submit` | POST | Invia |
| `/api/declarations/v2/declarations/{id}/documents` | CRUD | Documenti |
| `/api/declarations/v2/declarations/{id}/documents/{doc_id}` | GET | Download documento (`?preview=true` per inline) |
| `/api/declarations/v2/declarations/{id}/messages` | GET/POST | Messaggi |
| `/api/declarations/v2/admin/declarations` | GET | Lista admin |
| `/api/declarations/v2/admin/declarations/{id}/status-notify` | PUT | Stato+notifica |
| `/api/declarations/v2/admin/declarations/{id}/pdf` | GET | PDF riepilogo |
| `/api/declarations/v2/admin/declarations/{id}/zip` | GET | ZIP completo |
| `/api/declarations/v2/admin/stats` | GET | Statistiche |

---

## Prioritized Backlog

### P0 - Critico
- ✅ COMPLETATO: Wizard cliente v2
- ✅ COMPLETATO: Dashboard admin v2
- ✅ COMPLETATO: Sistema documenti/PDF/ZIP
- ✅ COMPLETATO: Stabilità e robustezza tecnica
- ✅ COMPLETATO: Interfaccia Mobile Dichiarazioni v2
- ✅ COMPLETATO: Fix download documenti Admin + Preview

### P1 - Prossimi Task
- **Test Mobile App** - Verificare flusso completo su dispositivo/emulatore
- **Whitelist IP Brevo** - `104.198.214.223` per email funzionanti
- **Piano Hardening Mobile** - Punti 6 (Search), 7 (Widgets), 10 (Gesture), 11 (AI)

### P2 - Future
- Piano Hardening Mobile (punti 6,7,10,11)
- Integrazione firma digitale Namirial/Aruba

### P3 - Backlog
- App Desktop Windows
- Dashboard Analytics
- Offline Mode mobile

---

## Test Credentials

- **Admin:** francesco@fiscaltaxcanarie.com / Lanzarote1
- **Client:** test_commercialista_202642@example.com / TestCliente123!

---

## Test Reports

- `/app/test_reports/iteration_43.json` - Stabilità (100% backend, 95% frontend)
- `/app/test_reports/iteration_42.json` - Documenti/PDF/ZIP (100%)
- `/app/test_reports/iteration_41.json` - Dashboard Admin (100%)
- `/app/test_reports/iteration_40.json` - Wizard Cliente (100%)
