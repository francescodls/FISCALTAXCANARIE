import { useTheme } from "next-themes"

// Sistema di notifica completamente custom che NON usa postMessage
let toastContainer = null;
let toastId = 0;

const createToastElement = (message, type = 'error') => {
  if (typeof document === 'undefined') return;
  
  // Crea container se non esiste
  if (!toastContainer || !document.getElementById('custom-toast-container')) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'custom-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  
  const colors = {
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '✕' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '✓' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: 'ℹ' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', icon: '⚠' }
  };
  
  const color = colors[type] || colors.error;
  
  const toastEl = document.createElement('div');
  toastEl.id = `toast-${++toastId}`;
  toastEl.style.cssText = `
    background: ${color.bg};
    border: 1px solid ${color.border};
    color: ${color.text};
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 400px;
    font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toastSlideIn 0.3s ease;
  `;
  
  toastEl.innerHTML = `
    <span style="font-weight: bold; font-size: 16px;">${color.icon}</span>
    <span>${String(message || 'Errore')}</span>
  `;
  
  // Aggiungi animazione CSS se non esiste
  if (!document.getElementById('toast-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-animation-styles';
    style.textContent = `
      @keyframes toastSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  toastContainer.appendChild(toastEl);
  
  // Auto-remove dopo 5 secondi
  setTimeout(() => {
    toastEl.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
    }, 300);
  }, 5000);
  
  return toastId;
};

// Helper per convertire qualsiasi valore in stringa sicura
const safeStringify = (value) => {
  if (value === null || value === undefined) return 'Errore';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || 'Errore';
  if (typeof value === 'object') {
    try {
      if (value.message) return String(value.message);
      if (value.detail) return String(value.detail);
      if (value.error) return String(value.error);
      return JSON.stringify(value);
    } catch {
      return 'Errore';
    }
  }
  return String(value);
};

// Toast API completamente custom - NO sonner, NO postMessage
const toast = {
  success: (msg) => createToastElement(safeStringify(msg), 'success'),
  error: (msg) => createToastElement(safeStringify(msg), 'error'),
  info: (msg) => createToastElement(safeStringify(msg), 'info'),
  warning: (msg) => createToastElement(safeStringify(msg), 'warning'),
  loading: (msg) => createToastElement(safeStringify(msg), 'info'),
  dismiss: () => {},
  promise: () => {},
  custom: () => {},
};

// Toaster component vuoto - non usiamo più sonner
const Toaster = () => null;

export { Toaster, toast }
