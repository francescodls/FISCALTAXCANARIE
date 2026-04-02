# Guida Pubblicazione App Fiscal Tax Canarie

## Prerequisiti

### Account Necessari
1. **Google Play Console** - Account Developer ($25 una tantum)
   - Vai su: https://play.google.com/console/signup
   - Completa la verifica dell'identità
   
2. **Apple Developer Program** - ($99/anno)
   - Vai su: https://developer.apple.com/programs/enroll/
   - Completa la verifica (può richiedere alcuni giorni)

3. **Expo Account** (gratuito)
   - Vai su: https://expo.dev/signup
   - Crea un account

---

## Step 1: Configurazione Iniziale

### 1.1 Installa EAS CLI
```bash
npm install -g eas-cli
```

### 1.2 Login su Expo
```bash
eas login
```

### 1.3 Configura il progetto
```bash
cd /app/mobile-app/fiscal-tax-mobile
eas init
```

Questo genererà un `projectId` da inserire in `app.json` e `App.tsx`.

---

## Step 2: Preparazione Asset

### 2.1 Icona App (OBBLIGATORIA)
- **Dimensione**: 1024x1024 px
- **Formato**: PNG senza trasparenza
- **Posizione**: `assets/icon.png`

### 2.2 Splash Screen
- **Dimensione**: 1284x2778 px (o scalabile)
- **Formato**: PNG
- **Posizione**: `assets/splash.png`

### 2.3 Adaptive Icon Android
- **Dimensione**: 1024x1024 px
- **Formato**: PNG con trasparenza (solo foreground)
- **Posizione**: `assets/adaptive-icon.png`

---

## Step 3: Build Android (APK/AAB)

### 3.1 Build APK per test interno
```bash
eas build --platform android --profile preview
```

### 3.2 Build AAB per Play Store (produzione)
```bash
eas build --platform android --profile production
```

Il build viene eseguito sui server Expo. Al termine riceverai un link per scaricare il file.

---

## Step 4: Pubblicazione Google Play Store

### 4.1 Crea l'app su Play Console
1. Vai su https://play.google.com/console
2. Click "Crea app"
3. Inserisci:
   - Nome: **Fiscal Tax Canarie**
   - Lingua: Italiano
   - Tipo: App
   - Gratuita/A pagamento: Gratuita

### 4.2 Compila le informazioni
1. **Scheda negozio**:
   - Titolo: Fiscal Tax Canarie
   - Descrizione breve: Area clienti per lo studio Fiscal Tax Canarie
   - Descrizione completa: (vedere sotto)
   - Screenshots (minimo 2 per tipo di dispositivo)
   - Icona: 512x512
   - Immagine in evidenza: 1024x500

2. **Classificazione dei contenuti**: Compila il questionario

3. **Privacy Policy**: https://fiscaltaxcanarie.com/privacy-policy/

### 4.3 Carica l'AAB
1. Vai su "Produzione" > "Nuova release"
2. Carica il file .aab
3. Aggiungi note di release
4. Invia per revisione

### Descrizione Play Store suggerita:
```
Fiscal Tax Canarie - Area Clienti

L'app ufficiale per i clienti dello studio Fiscal Tax Canarie SLP.

FUNZIONALITÀ:
• Consulta i tuoi documenti fiscali
• Ricevi notifiche importanti in tempo reale
• Monitora le tue dichiarazioni dei redditi
• Comunica direttamente con lo studio
• Visualizza scadenze e appuntamenti
• Gestisci il tuo profilo e i consensi privacy

SICUREZZA:
• Accesso protetto con credenziali personali
• Dati trattati nel rispetto del GDPR
• Connessione sicura crittografata

REQUISITI:
• Account cliente Fiscal Tax Canarie attivo
• Connessione internet

Per assistenza: info@fiscaltaxcanarie.com

© Fiscal Tax Canarie SLP - Las Palmas de Gran Canaria
```

---

## Step 5: Build iOS

### 5.1 Configura certificati Apple
```bash
eas credentials
```
Segui le istruzioni per configurare:
- Distribution Certificate
- Provisioning Profile

### 5.2 Build IPA per App Store
```bash
eas build --platform ios --profile production
```

---

## Step 6: Pubblicazione App Store

### 6.1 Crea l'app su App Store Connect
1. Vai su https://appstoreconnect.apple.com
2. "Le mie app" > "+"  > "Nuova app"
3. Inserisci:
   - Nome: Fiscal Tax Canarie
   - Lingua principale: Italiano
   - Bundle ID: com.fiscaltaxcanarie.clientapp
   - SKU: fiscaltaxcanarie-client-v1

### 6.2 Compila i metadati
1. **Informazioni app**:
   - Categoria: Business / Finanza
   - Sottocategoria: Contabilità
   
2. **Screenshot**: 
   - iPhone 6.7" (1290x2796)
   - iPhone 6.5" (1284x2778)
   - iPhone 5.5" (1242x2208)
   - iPad Pro 12.9" (2048x2732)

3. **Descrizione**: (usa la stessa di Play Store)

4. **Parole chiave**: fiscale, tasse, commercialista, documenti, canarie, dichiarazione

5. **Privacy Policy URL**: https://fiscaltaxcanarie.com/privacy-policy/

6. **Support URL**: https://fiscaltaxcanarie.com

### 6.3 Carica con EAS Submit
```bash
eas submit --platform ios
```

O usa Transporter app su Mac.

---

## Step 7: Push Notifications (Firebase)

### 7.1 Crea progetto Firebase
1. Vai su https://console.firebase.google.com
2. Crea nuovo progetto: "Fiscal Tax Canarie"
3. Abilita Cloud Messaging

### 7.2 Configura Android
1. Aggiungi app Android con package: `com.fiscaltaxcanarie.clientapp`
2. Scarica `google-services.json`
3. Posizionalo nella root del progetto

### 7.3 Configura iOS
1. Aggiungi app iOS con bundle ID: `com.fiscaltaxcanarie.clientapp`
2. Scarica `GoogleService-Info.plist`
3. Carica la chiave APNs su Firebase

### 7.4 Configura Backend
Aggiungi endpoint per salvare i push token e inviare notifiche.

---

## Tempistiche Stimate

| Fase | Tempo |
|------|-------|
| Verifica account Google | 1-3 giorni |
| Verifica account Apple | 1-5 giorni |
| Build Android | 10-30 minuti |
| Build iOS | 20-45 minuti |
| Review Play Store | 1-3 giorni |
| Review App Store | 1-7 giorni |

---

## Checklist Pre-Pubblicazione

- [ ] Account Google Play verificato
- [ ] Account Apple Developer verificato
- [ ] Icona 1024x1024 pronta
- [ ] Screenshots preparati
- [ ] Descrizione app scritta
- [ ] Privacy Policy URL funzionante
- [ ] Build APK testato manualmente
- [ ] Login funzionante
- [ ] Notifiche push configurate
- [ ] Analytics configurato (opzionale)

---

## Supporto

Per qualsiasi problema durante la pubblicazione:
- Expo Docs: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- Play Console Help: https://support.google.com/googleplay/android-developer
- App Store Connect Help: https://developer.apple.com/help/app-store-connect/

---

*Guida creata per Fiscal Tax Canarie - Aprile 2026*
