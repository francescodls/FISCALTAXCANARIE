/**
 * Hook personalizzato per fetch con retry automatico
 * Gestisce errori di rete con retry e feedback utente
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/sonner';

const DEFAULT_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Hook per API calls con retry automatico
 */
export function useApiWithRetry() {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  const fetchWithRetry = useCallback(async (
    url,
    options = {},
    {
      retries = DEFAULT_RETRY_COUNT,
      retryDelay = RETRY_DELAY_MS,
      showErrorToast = true,
      errorMessage = 'Errore di connessione. Riprovo...'
    } = {}
  ) => {
    setIsLoading(true);
    
    // Cancella richiesta precedente se esiste
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: abortControllerRef.current.signal
        });

        setIsLoading(false);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        
        // Non ritentare se richiesta cancellata
        if (error.name === 'AbortError') {
          setIsLoading(false);
          return null;
        }

        // Se è l'ultimo tentativo, mostra errore
        if (attempt === retries) {
          setIsLoading(false);
          if (showErrorToast) {
            toast.error(
              error.message.includes('fetch') 
                ? 'Impossibile connettersi al server. Verifica la connessione.'
                : error.message
            );
          }
          throw error;
        }

        // Mostra messaggio di retry
        if (attempt > 0 && showErrorToast) {
          toast.info(`${errorMessage} (tentativo ${attempt + 1}/${retries})`);
        }

        // Attendi prima di riprovare
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    setIsLoading(false);
    throw lastError;
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { fetchWithRetry, isLoading, cancel };
}

/**
 * Hook per autosave con debounce, retry e stato visivo
 */
export function useAutosave(saveFunction, debounceMs = 1500) {
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);

  const triggerSave = useCallback((data) => {
    // Cancella timeout precedente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSaveStatus('pending');

    timeoutRef.current = setTimeout(async () => {
      // Evita salvataggi duplicati
      const dataString = JSON.stringify(data);
      if (dataString === lastSavedRef.current) {
        setSaveStatus('saved');
        return;
      }

      setSaveStatus('saving');
      
      try {
        await saveFunction(data);
        lastSavedRef.current = dataString;
        setSaveStatus('saved');
        
        // Reset a idle dopo 3 secondi
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Autosave error:', error);
        setSaveStatus('error');
        
        // Riprova dopo 5 secondi
        setTimeout(() => {
          if (saveStatus === 'error') {
            triggerSave(data);
          }
        }, 5000);
      }
    }, debounceMs);
  }, [saveFunction, debounceMs, saveStatus]);

  const resetStatus = useCallback(() => {
    setSaveStatus('idle');
    lastSavedRef.current = null;
  }, []);

  return { triggerSave, saveStatus, resetStatus };
}

/**
 * Componente indicatore stato salvataggio
 */
export function SaveStatusIndicator({ status }) {
  const statusConfig = {
    idle: null,
    pending: { text: 'Modifiche in sospeso...', color: 'text-slate-400', pulse: false },
    saving: { text: 'Salvataggio...', color: 'text-blue-500', pulse: true },
    saved: { text: 'Salvato ✓', color: 'text-green-600', pulse: false },
    error: { text: 'Errore salvataggio ⚠️', color: 'text-red-500', pulse: false }
  };

  const config = statusConfig[status];
  if (!config) return null;

  return (
    <span className={`text-sm flex items-center gap-1 ${config.color}`}>
      {config.pulse && (
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
      {config.text}
    </span>
  );
}

export default useApiWithRetry;
