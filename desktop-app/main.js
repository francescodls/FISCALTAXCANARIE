/**
 * Fiscal Tax Canarie - Desktop App
 * Main Process (Electron) - OTTIMIZZATO
 * 
 * Applicazione desktop per il pannello amministratore
 * Cross-platform: Mac + Windows
 * 
 * OTTIMIZZAZIONI v1.1:
 * - Avvio più veloce con lazy loading
 * - Cache aggressiva per risorse
 * - Preload del dominio
 * - GPU acceleration ottimizzata
 * - Memory management migliorato
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, Notification, shell, nativeImage, session } = require('electron');
const path = require('path');
const Store = require('electron-store');

// ============== OTTIMIZZAZIONI AVVIO ==============

// Disabilita GPU hardware acceleration se causa problemi
// app.disableHardwareAcceleration(); // Decommenta se l'app è lenta su alcuni Mac

// Ottimizzazioni memoria e performance
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('--disable-background-timer-throttling');

// ============== CONFIGURAZIONE ==============

// Store per persistenza preferenze (inizializzazione lazy)
let store = null;
function getStore() {
  if (!store) {
    store = new Store({
      defaults: {
        notificationsEnabled: true,
        startMinimized: false,
        startOnLogin: false,
        windowBounds: { width: 1400, height: 900 }
      }
    });
  }
  return store;
}

// URL della piattaforma - DOMINIO UFFICIALE
const PLATFORM_URL = 'https://app.fiscaltaxcanarie.com';
const ADMIN_URL = `${PLATFORM_URL}/admin`;

// Variabili globali
let mainWindow = null;
let tray = null;
let isQuitting = false;
let splashWindow = null;

// ============== SPLASH SCREEN (Avvio Veloce) ==============

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Leggi l'immagine del logo come base64
  const fs = require('fs');
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, 'build', 'icon_256x256.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  } catch (e) {
    console.error('Errore caricamento logo:', e);
  }

  // Contenuto splash con design moderno
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          -webkit-app-region: drag;
          overflow: hidden;
        }
        
        .splash-container {
          width: 100%;
          height: 100%;
          background: linear-gradient(165deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        }
        
        /* Effetto particelle sfondo */
        .particles {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 20px;
        }
        
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          animation: float 15s infinite;
        }
        
        .particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; }
        .particle:nth-child(2) { left: 20%; top: 80%; animation-delay: 2s; }
        .particle:nth-child(3) { left: 80%; top: 10%; animation-delay: 4s; }
        .particle:nth-child(4) { left: 70%; top: 60%; animation-delay: 1s; }
        .particle:nth-child(5) { left: 50%; top: 90%; animation-delay: 3s; }
        .particle:nth-child(6) { left: 90%; top: 40%; animation-delay: 5s; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 0.8; }
        }
        
        .content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .logo-container {
          width: 120px;
          height: 120px;
          margin-bottom: 24px;
          position: relative;
        }
        
        .logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 10px 30px rgba(14, 165, 233, 0.3));
          animation: logoFloat 3s ease-in-out infinite;
        }
        
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        /* Anello luminoso intorno al logo */
        .logo-glow {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border: 2px solid transparent;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(20, 184, 166, 0.3)) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: glowPulse 2s ease-in-out infinite;
        }
        
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        h1 {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          font-weight: 400;
          margin-bottom: 32px;
        }
        
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .loader {
          width: 180px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        
        .loader::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, #0ea5e9, #14b8a6, #0ea5e9);
          border-radius: 4px;
          animation: loading 1.5s ease-in-out infinite;
        }
        
        @keyframes loading {
          0% { left: -40%; }
          100% { left: 100%; }
        }
        
        .status {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .version {
          position: absolute;
          bottom: 20px;
          font-size: 11px;
          color: rgba(255,255,255,0.3);
        }
      </style>
    </head>
    <body>
      <div class="splash-container">
        <div class="particles">
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
        </div>
        
        <div class="content">
          <div class="logo-container">
            <div class="logo-glow"></div>
            ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" alt="Logo">` : `
              <svg class="logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="url(#grad)" stroke-width="3" fill="none"/>
                <rect x="25" y="55" width="12" height="25" fill="url(#grad)"/>
                <rect x="44" y="40" width="12" height="40" fill="url(#grad)"/>
                <rect x="63" y="25" width="12" height="55" fill="url(#grad)"/>
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0ea5e9"/>
                    <stop offset="100%" style="stop-color:#14b8a6"/>
                  </linearGradient>
                </defs>
              </svg>
            `}
          </div>
          
          <h1>Fiscal Tax Canarie</h1>
          <p class="subtitle">Gestione Fiscale Professionale</p>
          
          <div class="loader-container">
            <div class="loader"></div>
            <span class="status">Connessione in corso...</span>
          </div>
        </div>
        
        <span class="version">v1.2.0</span>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  splashWindow.center();
  splashWindow.show();
}

// ============== FINESTRA PRINCIPALE ==============

function createWindow() {
  const bounds = getStore().get('windowBounds');
  
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 768,
    title: 'Fiscal Tax Canarie',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Sessione persistente
      partition: 'persist:fiscaltax',
      // Ottimizzazioni rendering
      backgroundThrottling: false,
      enableWebSQL: false,
      spellcheck: false
    },
    // Stile macOS
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#f5f5f4', // Stone-50 per caricamento più pulito
    show: false
  });

  // ============== OTTIMIZZAZIONI SESSIONE ==============
  
  const ses = mainWindow.webContents.session;
  
  // Cache aggressiva
  ses.setPreloads([]);
  
  // Headers per performance
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Cache-Control'] = 'max-age=3600';
    callback({ requestHeaders: details.requestHeaders });
  });

  // ============== CARICAMENTO URL ==============
  
  // Carica SEMPRE il dominio ufficiale
  console.log('Loading URL:', PLATFORM_URL);
  mainWindow.loadURL(PLATFORM_URL, {
    userAgent: mainWindow.webContents.getUserAgent() + ' FiscalTaxDesktop/1.1'
  });

  // ============== EVENTI CARICAMENTO ==============

  // Quando DOM è pronto (prima di immagini/CSS)
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM Ready - URL:', mainWindow.webContents.getURL());
    
    // Inietta CSS per nascondere caricamento iniziale
    mainWindow.webContents.insertCSS(`
      /* Transizione fluida al caricamento */
      body { 
        opacity: 1 !important;
        transition: opacity 0.2s ease-in !important;
      }
    `);
  });

  // Quando pagina è completamente caricata
  mainWindow.webContents.on('did-finish-load', () => {
    const currentURL = mainWindow.webContents.getURL();
    console.log('Page loaded:', currentURL);
    
    // Verifica che sia il dominio corretto
    if (!currentURL.startsWith(PLATFORM_URL)) {
      console.warn('URL non corretto, redirect a:', PLATFORM_URL);
      mainWindow.loadURL(PLATFORM_URL);
      return;
    }
    
    // Chiudi splash e mostra finestra principale
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    
    if (!getStore().get('startMinimized')) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Errore caricamento
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorDescription, 'URL:', validatedURL);
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    
    // Mostra pagina offline
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    mainWindow.show();
  });

  // ============== GESTIONE FINESTRA ==============

  // Salva dimensioni finestra
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      const { width, height } = mainWindow.getBounds();
      getStore().set('windowBounds', { width, height });
    }
  });

  // Gestione chiusura (minimizza in tray su Mac)
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Apri link esterni nel browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Se è un link esterno al dominio, apri nel browser
    if (!url.startsWith(PLATFORM_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Blocca navigazione verso domini non autorizzati
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(PLATFORM_URL) && !url.startsWith('data:')) {
      console.warn('Blocked navigation to:', url);
      event.preventDefault();
    }
  });

  return mainWindow;
}

// ============== SYSTEM TRAY ==============

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'build', 'tray-icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Apri Fiscal Tax Canarie',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: 'Notifiche',
        type: 'checkbox',
        checked: getStore().get('notificationsEnabled'),
        click: (menuItem) => {
          getStore().set('notificationsEnabled', menuItem.checked);
        }
      },
      { type: 'separator' },
      {
        label: 'Dashboard',
        click: () => {
          mainWindow.loadURL(PLATFORM_URL);
          mainWindow.show();
        }
      },
      {
        label: 'Pannello Admin',
        click: () => {
          mainWindow.loadURL(ADMIN_URL);
          mainWindow.show();
        }
      },
      { type: 'separator' },
      {
        label: 'Ricarica',
        accelerator: 'CmdOrCtrl+R',
        click: () => mainWindow.reload()
      },
      {
        label: 'Cancella Cache e Ricarica',
        click: async () => {
          await mainWindow.webContents.session.clearCache();
          mainWindow.reload();
        }
      },
      { type: 'separator' },
      {
        label: 'Esci',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Fiscal Tax Canarie');
    tray.setContextMenu(contextMenu);
    
    // Click su tray mostra finestra
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (error) {
    console.error('Errore creazione tray:', error);
  }
}

// ============== MENU APPLICAZIONE ==============

function createMenu() {
  const template = [
    // Menu App (solo Mac)
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'Informazioni su Fiscal Tax Canarie' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Nascondi Fiscal Tax Canarie' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Esci da Fiscal Tax Canarie' }
      ]
    }] : []),
    // Menu File
    {
      label: 'File',
      submenu: [
        {
          label: 'Vai a Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow.loadURL(PLATFORM_URL)
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close', label: 'Chiudi Finestra' } : { role: 'quit', label: 'Esci' }
      ]
    },
    // Menu Modifica
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripeti' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        { role: 'selectAll', label: 'Seleziona Tutto' }
      ]
    },
    // Menu Vista
    {
      label: 'Vista',
      submenu: [
        { role: 'reload', label: 'Ricarica' },
        { role: 'forceReload', label: 'Ricarica Forzata' },
        { type: 'separator' },
        {
          label: 'Cancella Cache',
          click: async () => {
            await mainWindow.webContents.session.clearCache();
            mainWindow.reload();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Normale' },
        { role: 'zoomIn', label: 'Ingrandisci' },
        { role: 'zoomOut', label: 'Riduci' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Schermo Intero' }
      ]
    },
    // Menu Navigazione
    {
      label: 'Navigazione',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.loadURL(PLATFORM_URL)
        },
        {
          label: 'Pannello Admin',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.loadURL(ADMIN_URL)
        },
        {
          label: 'Clienti',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.loadURL(`${ADMIN_URL}/clients`)
        },
        {
          label: 'Dichiarazioni',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow.loadURL(`${ADMIN_URL}/declarations`)
        },
        { type: 'separator' },
        {
          label: 'Indietro',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            if (mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack();
            }
          }
        },
        {
          label: 'Avanti',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            if (mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward();
            }
          }
        }
      ]
    },
    // Menu Finestra
    {
      label: 'Finestra',
      submenu: [
        { role: 'minimize', label: 'Riduci a icona' },
        { role: 'zoom', label: 'Zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front', label: 'Porta tutto in primo piano' }
        ] : [
          { role: 'close', label: 'Chiudi' }
        ])
      ]
    },
    // Menu Aiuto
    {
      label: 'Aiuto',
      submenu: [
        {
          label: 'Supporto',
          click: () => shell.openExternal('mailto:info@fiscaltaxcanarie.com')
        },
        {
          label: 'Sito Web',
          click: () => shell.openExternal('https://www.fiscaltaxcanarie.com')
        },
        { type: 'separator' },
        {
          label: 'Debug: Mostra URL Corrente',
          click: () => {
            const url = mainWindow.webContents.getURL();
            console.log('Current URL:', url);
            Notification.isSupported() && new Notification({
              title: 'URL Corrente',
              body: url
            }).show();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============== IPC HANDLERS ==============

ipcMain.handle('get-notifications-enabled', () => {
  return getStore().get('notificationsEnabled');
});

ipcMain.handle('set-notifications-enabled', (event, enabled) => {
  getStore().set('notificationsEnabled', enabled);
  return enabled;
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  if (getStore().get('notificationsEnabled') && Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.handle('get-current-url', () => {
  return mainWindow ? mainWindow.webContents.getURL() : null;
});

// ============== EVENTI APP ==============

// App pronta
app.whenReady().then(() => {
  console.log('App ready - Fiscal Tax Canarie Desktop v1.1');
  console.log('Target URL:', PLATFORM_URL);
  
  // Mostra splash screen immediatamente
  createSplashWindow();
  
  // Crea finestra principale (carica in background)
  createWindow();
  createTray();
  createMenu();

  // Mac: ricrea finestra se clicchi sull'icona nel dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Tutte le finestre chiuse
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prima di chiudere
app.on('before-quit', () => {
  isQuitting = true;
});

// Gestione errori non catturati
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Fiscal Tax Canarie Desktop - Initializing...');
console.log('Platform URL:', PLATFORM_URL);
