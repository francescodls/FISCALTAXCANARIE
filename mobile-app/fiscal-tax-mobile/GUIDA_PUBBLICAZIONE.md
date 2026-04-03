# Guida Pubblicazione App Mobile - Fiscal Tax Canarie

## Prerequisiti

1. **Account Expo** (gratuito): https://expo.dev/signup
2. **Node.js** versione 18 o superiore
3. **EAS CLI** installato globalmente

---

## STEP 1: Setup Iniziale (da fare UNA SOLA VOLTA)

### 1.1 Installa EAS CLI
```bash
npm install -g eas-cli
```

### 1.2 Effettua il login su Expo
```bash
eas login
```
Inserisci le credenziali del tuo account Expo.

### 1.3 Vai nella cartella del progetto
```bash
cd /percorso/del/progetto/fiscal-tax-mobile
```

### 1.4 Elimina vecchi file di lock e reinstalla
```bash
rm -rf node_modules package-lock.json yarn.lock
npm install
```

### 1.5 Configura il progetto su EAS
```bash
eas init
```
Questo comando:
- Crea un nuovo progetto su Expo.dev
- Aggiorna automaticamente `app.json` con il tuo `projectId`
- Ti chiederà di confermare il nome del progetto

---

## STEP 2: Build Android (.aab per Play Store)

### 2.1 Lancia la build di produzione
```bash
eas build --platform android --profile production
```

Il processo chiederà:
- **"Generate a new Android Keystore?"** → Rispondi **Yes** (Expo lo conserverà per te)

La build verrà eseguita sui server di Expo (circa 10-20 minuti).

### 2.2 Scarica il file .aab
Al termine, riceverai un link per scaricare il file `.aab`.

---

## STEP 3: Pubblica su Google Play Store

### 3.1 Vai su Google Play Console
https://play.google.com/console

### 3.2 Crea una nuova app
- Nome: **Fiscal Tax Canarie**
- Lingua: Italiano
- Tipo: App
- Gratuita

### 3.3 Carica il file .aab
Vai in **Release > Production > Create new release** e carica il file `.aab`.

### 3.4 Compila le informazioni richieste
- Descrizione app
- Screenshot (almeno 2)
- Icona 512x512 px
- Privacy Policy URL
- Categoria: Finanza o Business

---

## STEP 4: Build iOS (.ipa per App Store)

### 4.1 Prerequisiti iOS
- **Account Apple Developer** ($99/anno): https://developer.apple.com
- **Mac con Xcode** installato (per gestire i certificati)

### 4.2 Lancia la build iOS
```bash
eas build --platform ios --profile production
```

Ti verrà chiesto di effettuare il login con il tuo Apple ID e di autorizzare la creazione dei certificati.

### 4.3 Submit su App Store
Dopo la build, puoi inviare direttamente:
```bash
eas submit --platform ios
```

---

## Comandi Utili

| Comando | Descrizione |
|---------|-------------|
| `eas build:list` | Vedere lo stato delle build |
| `eas build --platform android --profile preview` | Build APK per test interni |
| `eas device:create` | Registrare dispositivi iOS per test |
| `eas credentials` | Gestire certificati e keystore |

---

## Troubleshooting

### Errore "SDK version mismatch"
```bash
npx expo install --fix
```

### Errore di build Kotlin/Gradle
1. Verifica che tutte le dipendenze expo-* siano della stessa versione SDK
2. Cancella la cache: `rm -rf node_modules && npm install`

### Errore "EAS project not configured"
```bash
eas init
```

---

## File di Configurazione

- `app.json` - Configurazione generale Expo (nome, icone, permessi)
- `eas.json` - Profili di build (development, preview, production)
- `package.json` - Dipendenze del progetto

---

## Supporto

Per problemi con EAS Build: https://docs.expo.dev/build/troubleshooting/
