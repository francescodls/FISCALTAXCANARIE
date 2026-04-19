# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie, onorari e comunicazioni.

## What's Been Implemented

### Fase 99 (19 Aprile 2026) - COMPLETATA ✅

**Fix Download Documenti Admin + Funzionalità Anteprima (Preview)**

Risolto bug critico nel download documenti dalla pagina Admin e aggiunta funzionalità di anteprima file:

1. **Backend - `declarations_v2.py`**
   - Aggiunto parametro `preview=true` all'endpoint download documenti
   - Con `preview=true`: `Content-Disposition: inline` (file visualizzato nel browser)
   - Senza `preview`: `Content-Disposition: attachment` (file scaricato)

2. **Frontend - `AdminDeclarationsPage.jsx`**
   - Aggiunta funzione `downloadDocument()` nel componente `DocumentsTab`
   - Aggiunta funzione `getDocumentUrl()` con supporto preview
   - Aggiunta funzione `openPreview()` che apre PDF/immagini in nuova tab
   - Pulsante "Visualizza" (icona Eye blu) ora visibile per PDF e immagini
   - Pulsante "Scarica" (icona Download) per download diretto
   - Aggiunti `data-testid` per testing

**File modificati:**
- `/app/backend/routes/declarations_v2.py`
- `/app/frontend/src/pages/AdminDeclarationsPage.jsx`

**Test eseguiti:**
- ✅ curl: Download endpoint funziona con `Content-Disposition: attachment`
- ✅ curl: Preview endpoint funziona con `Content-Disposition: inline` 
- ✅ Screenshot: UI mostra correttamente pulsanti Visualizza/Scarica/Elimina

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
