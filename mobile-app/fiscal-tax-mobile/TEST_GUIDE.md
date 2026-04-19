# Guida Test Mobile App - Dichiarazioni V2

## Pre-requisiti
1. Expo Go installato su smartphone (iOS/Android)
2. Connessione di rete funzionante
3. Accesso alle credenziali di test

## Credenziali Test
- **Email:** `test_commercialista_202642@example.com`
- **Password:** `TestCliente123!`

---

## Nuova Funzionalita: Haptic Feedback

Il Wizard ora include **haptic feedback** (vibrazione tattile) per migliorare l'esperienza utente:

| Azione | Tipo Feedback |
|--------|---------------|
| Navigazione Avanti | Medium Impact |
| Navigazione Indietro | Light Impact |
| Cambio step (tab) | Selection |
| Toggle checkbox | Light Impact |
| Segna completata | Medium Impact |
| Upload documento | Light Impact |
| Upload successo | Success Notification |
| Upload errore | Error Notification |
| Elimina documento | Medium Impact |
| Accetta termini | Light Impact |
| Apri pannello firma | Medium Impact |
| Firma completata | Success Notification |
| Invio dichiarazione | Heavy Impact |
| Invio successo | Success Notification |
| Invio errore | Error Notification |

**Nota:** L'haptic feedback funziona solo su dispositivi fisici, non su emulatori.

---

## Test da Eseguire

### 1. Avvio App
```bash
cd /app/mobile-app/fiscal-tax-mobile
npx expo start
```
Scannerizza il QR code con Expo Go.

### 2. Test Login
- [ ] Login con credenziali test
- [ ] Verifica accesso alla Home

### 3. Test Lista Dichiarazioni
- [ ] Dalla Home, tocca "Dichiarazioni" o l'icona calendario
- [ ] Verifica che appaia la dichiarazione esistente (Anno 2024, stato "Bozza")
- [ ] Verifica progress bar (dovrebbe mostrare ~23%)

### 4. Test Wizard Compilazione
- [ ] Tocca sulla dichiarazione in stato "Bozza"
- [ ] Verifica apertura Wizard
- [ ] **Navigazione**: Tocca "Avanti" e "Indietro"
- [ ] **Step indicator**: Verifica che mostri 14 icone
- [ ] **Progress bar**: Verifica aggiornamento percentuale

### 5. Test Compilazione Sezioni
Per ogni sezione testare:
- [ ] **Dati Personali**: Compila nome, cognome, CF, email
- [ ] **Toggle "Non Applicabile"**: Attiva/disattiva su una sezione
- [ ] **Pulsante "Segna come completata"**: Verifica cambio stato
- [ ] **Autosave**: Modifica un campo, attendi 2 secondi, verifica indicatore salvataggio

### 6. Test Upload Documenti (Sezione 12)
- [ ] Tocca "Fotocamera" - Scatta foto
- [ ] Tocca "Galleria" - Seleziona immagine
- [ ] Tocca "File" - Seleziona PDF
- [ ] Verifica documento nella lista
- [ ] Tocca cestino per eliminare documento

### 7. Test Firma (Sezione 14)
- [ ] Completa almeno 7 sezioni (50%)
- [ ] Verifica messaggio "Puoi procedere con la firma"
- [ ] Accetta termini e condizioni
- [ ] Tocca "Apri Pannello Firma"
- [ ] Firma con il dito
- [ ] Tocca "Conferma"
- [ ] Verifica badge "Dichiarazione Firmata"

### 8. Test Invio
- [ ] Con dichiarazione firmata, tocca "Invia Dichiarazione"
- [ ] Conferma invio
- [ ] Verifica redirect a lista dichiarazioni
- [ ] Verifica stato cambiato in "Inviata"

### 9. Test Detail Screen (per dichiarazioni non editabili)
- [ ] Crea nuova dichiarazione se necessario
- [ ] Cambia stato da admin a "in_revisione"
- [ ] Verifica che aprendo si vada al Detail (non Wizard)
- [ ] Verifica tab Info, Chat, Documenti
- [ ] Test invio messaggio nella Chat

---

## Problemi Noti

### Firma Canvas
Se la firma non funziona:
- Assicurati che `react-native-webview` sia installato
- Riavvia Expo con `npx expo start --clear`

### Upload Documenti
Se l'upload fallisce:
- Verifica permessi fotocamera/galleria nelle impostazioni
- File max 10MB, formati: PDF, JPG, PNG

### Autosave
- L'indicatore "Salvando..." appare dopo 2 secondi dall'ultima modifica
- In caso di errore rete, viene mostrato un messaggio

---

## Checklist Finale

| Funzionalità | Stato |
|--------------|-------|
| Lista dichiarazioni V2 | ⬜ |
| Creazione nuova dichiarazione | ⬜ |
| Wizard 14 sezioni | ⬜ |
| Navigazione step | ⬜ |
| Autosave | ⬜ |
| Toggle non applicabile | ⬜ |
| Upload da fotocamera | ⬜ |
| Upload da galleria | ⬜ |
| Upload file/PDF | ⬜ |
| Elimina documento | ⬜ |
| Firma canvas | ⬜ |
| Invio dichiarazione | ⬜ |
| Detail screen (sola lettura) | ⬜ |
| Chat messaggi | ⬜ |

---

## API Backend Testate ✅

| Endpoint | Metodo | Stato |
|----------|--------|-------|
| `/api/declarations/v2/declarations` | GET | ✅ |
| `/api/declarations/v2/declarations` | POST | ✅ |
| `/api/declarations/v2/declarations/{id}` | GET | ✅ |
| `/api/declarations/v2/declarations/{id}/section` | PUT | ✅ |
| `/api/declarations/v2/declarations/{id}/sign` | POST | ✅ |
| `/api/declarations/v2/declarations/{id}/submit` | POST | ✅ |
| `/api/declarations/v2/declarations/{id}/documents` | GET | ✅ |
| `/api/declarations/v2/declarations/{id}/documents` | POST | ✅ |
| `/api/declarations/v2/declarations/{id}/documents/{docId}` | DELETE | ✅ |
| `/api/declarations/v2/declarations/{id}/messages` | GET | ✅ |
| `/api/declarations/v2/declarations/{id}/messages` | POST | ✅ |

Tutte le API sono state verificate e funzionano correttamente.
