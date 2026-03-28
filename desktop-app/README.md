# Fiscal Tax Canarie - Desktop App

Applicazione desktop per il pannello amministratore Fiscal Tax Canarie.

## Tecnologia

- **Electron** - Framework cross-platform per app desktop
- **electron-builder** - Packaging e distribuzione
- **electron-store** - Persistenza preferenze locali

## Requisiti

- Node.js 18+
- npm o yarn

## Installazione Dipendenze

```bash
cd desktop-app
npm install
# oppure
yarn install
```

## Sviluppo

Per avviare l'app in modalità sviluppo:

```bash
npm start
# oppure
yarn start
```

## Build

### Mac (DMG + ZIP)

```bash
npm run build:mac
```

Output: `dist/Fiscal Tax Canarie-1.0.0.dmg`

### Windows (NSIS Installer + Portable)

```bash
npm run build:win
```

Output: `dist/Fiscal Tax Canarie Setup 1.0.0.exe`

### Entrambe le piattaforme

```bash
npm run build:all
```

## Struttura Progetto

```
desktop-app/
├── main.js              # Processo principale Electron
├── preload.js           # Bridge sicuro main/renderer
├── offline.html         # Pagina offline
├── package.json         # Configurazione e dipendenze
├── build/               # Risorse per il build
│   ├── icon.png         # Icona app (512x512)
│   ├── icon.icns        # Icona Mac
│   ├── icon.ico         # Icona Windows
│   └── tray-icon.png    # Icona system tray
└── dist/                # Output build (generato)
```

## Funzionalità

### Già Implementate

- ✅ Wrapper della web app esistente
- ✅ Sessione persistente (non richiede login ripetuto)
- ✅ Icona nella system tray (Mac)
- ✅ Menu applicazione nativo
- ✅ Scorciatoie da tastiera
- ✅ Pagina offline con retry automatico
- ✅ Preferenze notifiche (attiva/disattiva)
- ✅ Navigazione rapida (Dashboard, Clienti, Dichiarazioni)

### Predisposte per Sviluppo Futuro

- 🔲 Notifiche desktop native (nuovi ticket, documenti, messaggi)
- 🔲 Auto-update dell'app
- 🔲 Avvio automatico all'accensione
- 🔲 Badge icona dock con conteggio notifiche

## Configurazione Piattaforma

L'app punta a: `https://app.fiscaltaxcanarie.com`

Per cambiare l'URL, modifica la costante `PLATFORM_URL` in `main.js`.

## Note per la Distribuzione

### Mac (senza firma)

L'app non firmata mostrerà un avviso di sicurezza. Per aprirla:
1. Clicca destro sull'app → "Apri"
2. Oppure: Preferenze di Sistema → Sicurezza e Privacy → "Apri comunque"

### Mac (con firma) - Richiede Apple Developer Account

1. Ottieni certificato Developer ID
2. Aggiungi in `package.json`:
```json
"mac": {
  "identity": "Developer ID Application: Fiscal Tax Canarie SLP"
}
```
3. Notarizza l'app con Apple

### Windows

L'installer NSIS funziona senza firma, ma mostrerà un avviso SmartScreen.
Per rimuovere l'avviso, è necessario un certificato code signing.

## Supporto

- Email: info@fiscaltaxcanarie.com
- Web: https://www.fiscaltaxcanarie.com
