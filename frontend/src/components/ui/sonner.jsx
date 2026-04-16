import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"

// Wrapper sicuro per toast che previene errori di serializzazione
const safeStringify = (value) => {
  if (value === null || value === undefined) return 'Errore';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || 'Errore';
  if (typeof value === 'object') {
    try {
      // Prova a estrarre un messaggio dall'oggetto
      if (value.message) return String(value.message);
      if (value.detail) return String(value.detail);
      if (value.error) return String(value.error);
      // Fallback: stringify sicuro
      return JSON.stringify(value);
    } catch {
      return 'Errore';
    }
  }
  return String(value);
};

// Toast wrapper con protezione errori
const toast = {
  success: (msg, opts) => {
    try {
      sonnerToast.success(safeStringify(msg), opts);
    } catch (e) {
      console.log('Toast success:', safeStringify(msg));
    }
  },
  error: (msg, opts) => {
    try {
      sonnerToast.error(safeStringify(msg), opts);
    } catch (e) {
      console.error('Toast error:', safeStringify(msg));
    }
  },
  info: (msg, opts) => {
    try {
      sonnerToast.info(safeStringify(msg), opts);
    } catch (e) {
      console.log('Toast info:', safeStringify(msg));
    }
  },
  warning: (msg, opts) => {
    try {
      sonnerToast.warning(safeStringify(msg), opts);
    } catch (e) {
      console.warn('Toast warning:', safeStringify(msg));
    }
  },
  loading: (msg, opts) => {
    try {
      return sonnerToast.loading(safeStringify(msg), opts);
    } catch (e) {
      console.log('Toast loading:', safeStringify(msg));
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
