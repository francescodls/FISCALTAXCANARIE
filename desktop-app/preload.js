/**
 * Fiscal Tax Canarie - Desktop App
 * Preload Script (Bridge sicuro tra main e renderer)
 */

const { contextBridge, ipcRenderer } = require('electron');

// Esponi API sicure al renderer (web app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Gestione notifiche
  getNotificationsEnabled: () => ipcRenderer.invoke('get-notifications-enabled'),
  setNotificationsEnabled: (enabled) => ipcRenderer.invoke('set-notifications-enabled', enabled),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  
  // Verifica nuovi ticket
  checkNewTickets: (count) => {
    // Questo viene chiamato dallo script iniettato
    console.log('Desktop: Tickets count:', count);
  },
  
  // Verifica dichiarazioni
  checkDeclarations: (data) => {
    // Questo viene chiamato dallo script iniettato
    console.log('Desktop: Declarations data received');
  },
  
  // Info piattaforma
  platform: process.platform,
  isDesktopApp: true,
  
  // Versione app
  getVersion: () => '1.0.0'
});

// Log per debug
console.log('Fiscal Tax Canarie Desktop: Preload script loaded');
console.log('Platform:', process.platform);
