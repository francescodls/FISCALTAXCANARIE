/**
 * Fiscal Tax Canarie - Desktop App
 * Main Process (Electron) - ULTRA OTTIMIZZATO v1.2
 * 
 * OTTIMIZZAZIONI AVVIO VELOCE:
 * - Splash screen HTML inline minificato (zero I/O)
 * - Lazy loading AGGRESSIVO di tutti i moduli non critici
 * - Preconnect DNS prima del caricamento
 * - Main window in background mentre splash è visibile
 * - Cache session persistente
 * - Chromium flags ottimizzati per startup
 */

// ============== CRITICAL PATH - MINIMO ASSOLUTO ==============
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Chromium flags per avvio ultra-veloce
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--no-zygote');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-background-networking');
app.commandLine.appendSwitch('--disable-default-apps');
app.commandLine.appendSwitch('--disable-extensions');
app.commandLine.appendSwitch('--disable-sync');
app.commandLine.appendSwitch('--disable-translate');
app.commandLine.appendSwitch('--no-first-run');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=256 --optimize-for-size');

// ============== VARIABILI GLOBALI ==============
const PLATFORM_URL = 'https://app.fiscaltaxcanarie.com';
const ADMIN_URL = `${PLATFORM_URL}/admin`;

let mainWindow = null;
let tray = null;
let isQuitting = false;
let splashWindow = null;
let store = null;

// Lazy loaded modules (caricati DOPO che la UI è visibile)
let Menu, Tray, ipcMain, Notification, shell, nativeImage, session;

// ============== STORE (Lazy) ==============
function getStore() {
  if (!store) {
    const Store = require('electron-store');
    store = new Store({
      defaults: {
        notificationsEnabled: true,
        startMinimized: false,
        windowBounds: { width: 1400, height: 900 }
      }
    });
  }
  return store;
}

// ============== SPLASH SCREEN ULTRA-LEGGERA ==============
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 360,
    height: 260,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      offscreen: false
    }
  });

  // HTML minificato inline - ZERO I/O = avvio istantaneo
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;height:100vh;display:flex;align-items:center;justify-content:center;-webkit-app-region:drag;overflow:hidden}.c{width:100%;height:100%;background:linear-gradient(160deg,#1a1a2e,#16213e 50%,#0f3460);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 15px 50px rgba(0,0,0,.35)}.l{width:70px;height:70px;margin-bottom:16px;animation:p 1.8s ease-in-out infinite}@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}h1{font-size:20px;font-weight:600;color:#fff;margin-bottom:4px}p{font-size:11px;color:rgba(255,255,255,.45);margin-bottom:20px}.b{width:120px;height:3px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden}.b::after{content:'';display:block;width:35%;height:100%;background:linear-gradient(90deg,#0ea5e9,#14b8a6);border-radius:3px;animation:ld 1s ease-in-out infinite}@keyframes ld{0%{transform:translateX(-100%)}100%{transform:translateX(380%)}}.v{position:absolute;bottom:10px;font-size:9px;color:rgba(255,255,255,.2)}</style></head><body><div class="c"><svg class="l" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="40" stroke="url(#g)" stroke-width="2.5"/><rect x="26" y="50" width="10" height="22" fill="url(#g)"/><rect x="45" y="38" width="10" height="34" fill="url(#g)"/><rect x="64" y="26" width="10" height="46" fill="url(#g)"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#14b8a6"/></linearGradient></defs></svg><h1>Fiscal Tax Canarie</h1><p>Connessione...</p><div class="b"></div><span class="v">v1.2.0</span></div></body></html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    splashWindow.center();
  });
}

// ============== MAIN WINDOW ==============
function createMainWindow() {
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
      partition: 'persist:fiscaltax',
      backgroundThrottling: false,
      spellcheck: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#f5f5f4',
    show: false
  });

  // Ottimizzazioni sessione
  const ses = mainWindow.webContents.session;
  ses.setPreloads([]);
  
  // Preconnect per DNS lookup anticipato
  ses.webRequest.onBeforeRequest({ urls: ['*://*.fiscaltaxcanarie.com/*'] }, (details, callback) => {
    callback({ cancel: false });
  });

  // Carica URL
  mainWindow.loadURL(ADMIN_URL);

  // Quando pronto, chiudi splash e mostra main
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
      
      // Carica moduli non critici DOPO che l'UI è visibile
      loadNonCriticalModules();
    }, 300);
  });

  // Fallback se caricamento fallisce
  mainWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Load failed:', errorDescription);
    loadOfflinePage();
  });

  // Salva dimensioni finestra
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      const bounds = mainWindow.getBounds();
      getStore().set('windowBounds', { width: bounds.width, height: bounds.height });
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// ============== CARICAMENTO MODULI NON CRITICI (POST-UI) ==============
function loadNonCriticalModules() {
  // Carica moduli pesanti solo DOPO che l'UI è visibile
  const electron = require('electron');
  Menu = electron.Menu;
  Tray = electron.Tray;
  ipcMain = electron.ipcMain;
  Notification = electron.Notification;
  shell = electron.shell;
  nativeImage = electron.nativeImage;
  session = electron.session;
  
  // Setup menu e tray in background
  setTimeout(() => {
    setupMenu();
    setupTray();
    setupIPC();
  }, 500);
}

// ============== MENU ==============
function setupMenu() {
  const template = [
    {
      label: 'Fiscal Tax Canarie',
      submenu: [
        { label: 'Informazioni', role: 'about' },
        { type: 'separator' },
        { label: 'Preferenze...', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('open-settings') },
        { type: 'separator' },
        { label: 'Nascondi', role: 'hide' },
        { label: 'Nascondi altri', role: 'hideOthers' },
        { label: 'Mostra tutti', role: 'unhide' },
        { type: 'separator' },
        { label: 'Esci', accelerator: 'CmdOrCtrl+Q', click: () => { isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { label: 'Annulla', role: 'undo' },
        { label: 'Ripeti', role: 'redo' },
        { type: 'separator' },
        { label: 'Taglia', role: 'cut' },
        { label: 'Copia', role: 'copy' },
        { label: 'Incolla', role: 'paste' },
        { label: 'Seleziona tutto', role: 'selectAll' }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        { label: 'Ricarica', role: 'reload' },
        { label: 'Ricarica forzata', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom -', role: 'zoomOut' },
        { label: 'Zoom Reset', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Schermo intero', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Finestra',
      submenu: [
        { label: 'Minimizza', role: 'minimize' },
        { label: 'Chiudi', role: 'close' }
      ]
    }
  ];

  if (Menu) {
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

// ============== TRAY ==============
function setupTray() {
  if (!Tray || !nativeImage) return;
  
  try {
    const iconPath = path.join(__dirname, 'build', 'tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('Fiscal Tax Canarie');
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Apri Dashboard', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: 'separator' },
      { label: 'Esci', click: () => { isQuitting = true; app.quit(); } }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (e) {
    console.error('Tray error:', e);
  }
}

// ============== IPC ==============
function setupIPC() {
  if (!ipcMain) return;
  
  ipcMain.handle('get-notifications-enabled', () => getStore().get('notificationsEnabled'));
  ipcMain.handle('set-notifications-enabled', (event, enabled) => {
    getStore().set('notificationsEnabled', enabled);
    return enabled;
  });
}

// ============== OFFLINE PAGE ==============
function loadOfflinePage() {
  const offlineHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;background:#f5f5f4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.c{text-align:center;padding:40px}h1{color:#0d9488;margin-bottom:16px}p{color:#666;margin-bottom:24px}button{background:#0d9488;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px}button:hover{background:#0f766e}</style></head><body><div class="c"><h1>Connessione non disponibile</h1><p>Verifica la connessione internet</p><button onclick="location.reload()">Riprova</button></div></body></html>`;
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHTML)}`);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
  }
}

// ============== APP LIFECYCLE ==============

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Ready - Avvio ultra-veloce
app.whenReady().then(() => {
  // 1. Mostra splash IMMEDIATAMENTE
  createSplashWindow();
  
  // 2. Crea main window in BACKGROUND (non blocca splash)
  setImmediate(() => {
    createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createSplashWindow();
    setImmediate(() => createMainWindow());
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

console.log('Fiscal Tax Canarie Desktop v1.2.0 - Ultra Fast Edition');
console.log('Platform:', PLATFORM_URL);
