/**
 * Fiscal Tax Canarie - Desktop App
 * Main Process (Electron)
 * 
 * Applicazione desktop per il pannello amministratore
 * Cross-platform: Mac + Windows
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, Notification, shell, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Store per persistenza preferenze
const store = new Store({
  defaults: {
    notificationsEnabled: true,
    startMinimized: false,
    startOnLogin: false,
    windowBounds: { width: 1400, height: 900 }
  }
});

// URL della piattaforma
const PLATFORM_URL = 'https://app.fiscaltaxcanarie.com';
const ADMIN_URL = `${PLATFORM_URL}/admin`;

// Variabili globali
let mainWindow = null;
let tray = null;
let isQuitting = false;

// Crea la finestra principale
function createWindow() {
  const bounds = store.get('windowBounds');
  
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
      // Abilita persistenza sessione
      partition: 'persist:fiscaltax'
    },
    // Stile macOS
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0d9488', // Teal come il brand
    show: false // Mostra solo quando pronto
  });

  // Carica la piattaforma
  mainWindow.loadURL(PLATFORM_URL);

  // Mostra quando pronto (evita flash bianco)
  mainWindow.once('ready-to-show', () => {
    if (!store.get('startMinimized')) {
      mainWindow.show();
    }
  });

  // Salva dimensioni finestra
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
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
    // Se è un link esterno, apri nel browser
    if (!url.startsWith(PLATFORM_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Gestione navigazione
  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('Navigated to:', url);
  });

  // Gestione errori di caricamento
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
    // Mostra pagina di errore offline
    if (errorCode === -106) { // ERR_INTERNET_DISCONNECTED
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  // Inietta script per intercettare eventi (notifiche, logout, etc.)
  mainWindow.webContents.on('did-finish-load', () => {
    injectNotificationListener();
  });

  return mainWindow;
}

// Inietta listener per eventi dalla web app
function injectNotificationListener() {
  mainWindow.webContents.executeJavaScript(`
    // Notifica all'app desktop quando ci sono nuovi dati
    (function() {
      // Intercetta fetch per rilevare nuovi dati
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // Clona la response per leggere i dati
        const clonedResponse = response.clone();
        
        try {
          const url = args[0];
          if (typeof url === 'string') {
            // Nuovi ticket
            if (url.includes('/api/tickets') && response.ok) {
              const data = await clonedResponse.json();
              if (Array.isArray(data)) {
                window.electronAPI?.checkNewTickets?.(data.length);
              }
            }
            // Nuove dichiarazioni con richieste
            if (url.includes('/api/declarations') && response.ok) {
              const data = await clonedResponse.json();
              window.electronAPI?.checkDeclarations?.(data);
            }
          }
        } catch (e) {
          // Ignora errori di parsing
        }
        
        return response;
      };
      
      console.log('Fiscal Tax Desktop: Notification listener injected');
    })();
  `).catch(err => console.log('Script injection skipped'));
}

// Crea icona nella system tray
function createTray() {
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
      checked: store.get('notificationsEnabled'),
      click: (menuItem) => {
        store.set('notificationsEnabled', menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow.loadURL(ADMIN_URL);
        mainWindow.show();
      }
    },
    {
      label: 'Clienti',
      click: () => {
        mainWindow.loadURL(`${ADMIN_URL}/clients`);
        mainWindow.show();
      }
    },
    {
      label: 'Dichiarazioni',
      click: () => {
        mainWindow.loadURL(`${ADMIN_URL}/declarations`);
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Ricarica',
      accelerator: 'CmdOrCtrl+R',
      click: () => mainWindow.reload()
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
}

// Crea menu applicazione
function createMenu() {
  const template = [
    // Menu App (solo Mac)
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'Informazioni su Fiscal Tax Canarie' },
        { type: 'separator' },
        {
          label: 'Preferenze...',
          accelerator: 'CmdOrCtrl+,',
          click: () => openPreferences()
        },
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
          label: 'Nuova Finestra',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
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
          click: () => mainWindow.loadURL(ADMIN_URL)
        },
        {
          label: 'Clienti',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.loadURL(`${ADMIN_URL}/clients`)
        },
        {
          label: 'Dichiarazioni',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.loadURL(`${ADMIN_URL}/declarations`)
        },
        { type: 'separator' },
        {
          label: 'Indietro',
          accelerator: 'CmdOrCtrl+[',
          click: () => mainWindow.webContents.goBack()
        },
        {
          label: 'Avanti',
          accelerator: 'CmdOrCtrl+]',
          click: () => mainWindow.webContents.goForward()
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
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Mostra notifica desktop
function showNotification(title, body, onClick) {
  if (!store.get('notificationsEnabled')) return;
  
  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, 'build', 'icon.png'),
    silent: false
  });
  
  notification.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
    if (onClick) onClick();
  });
  
  notification.show();
}

// Apri preferenze (placeholder - può essere espanso)
function openPreferences() {
  // Per ora mostra le preferenze nel menu tray
  // In futuro si può creare una finestra preferenze dedicata
  tray.popUpContextMenu();
}

// IPC Handlers per comunicazione con renderer
ipcMain.handle('get-notifications-enabled', () => {
  return store.get('notificationsEnabled');
});

ipcMain.handle('set-notifications-enabled', (event, enabled) => {
  store.set('notificationsEnabled', enabled);
  return enabled;
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  showNotification(title, body);
});

// Evento: app pronta
app.whenReady().then(() => {
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

// Evento: tutte le finestre chiuse
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento: prima di chiudere
app.on('before-quit', () => {
  isQuitting = true;
});

// Gestione errori non catturati
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

console.log('Fiscal Tax Canarie Desktop - Starting...');
