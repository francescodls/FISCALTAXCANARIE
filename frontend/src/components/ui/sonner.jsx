import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"

// Sistema di notifica alternativo che non usa postMessage
let toastContainer = null;
let toastId = 0;

const createToastElement = (message, type = 'error') => {
  if (typeof document === 'undefined') return;
  
  // Crea container se non esiste
  if (!toastContainer) {
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
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' }
  };
  
  const color = colors[type] || colors.error;
  
  const toast = document.createElement('div');
  toast.id = `toast-${++toastId}`;
  toast.style.cssText = `
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
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = String(message || 'Errore');
  
  // Aggiungi animazione CSS
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  toastContainer.appendChild(toast);
  
  // Auto-remove dopo 5 secondi
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

// Wrapper sicuro per toast che previene errori di serializzazione
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

// Toast wrapper con doppio fallback: sonner + custom
const toast = {
  success: (msg, opts) => {
    const safeMsg = safeStringify(msg);
    try {
      sonnerToast.success(safeMsg, opts);
    } catch (e) {
      createToastElement(safeMsg, 'success');
    }
  },
  error: (msg, opts) => {
    const safeMsg = safeStringify(msg);
    try {
      sonnerToast.error(safeMsg, opts);
    } catch (e) {
      createToastElement(safeMsg, 'error');
    }
  },
  info: (msg, opts) => {
    const safeMsg = safeStringify(msg);
    try {
      sonnerToast.info(safeMsg, opts);
    } catch (e) {
      createToastElement(safeMsg, 'info');
    }
  },
  warning: (msg, opts) => {
    const safeMsg = safeStringify(msg);
    try {
      sonnerToast.warning(safeMsg, opts);
    } catch (e) {
      createToastElement(safeMsg, 'warning');
    }
  },
  loading: (msg, opts) => {
    const safeMsg = safeStringify(msg);
    try {
      return sonnerToast.loading(safeMsg, opts);
    } catch (e) {
      createToastElement(safeMsg, 'info');
      return null;
    }
  },
  dismiss: (id) => {
    try {
      sonnerToast.dismiss(id);
    } catch (e) {
      // Ignore
    }
  },
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
};

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
