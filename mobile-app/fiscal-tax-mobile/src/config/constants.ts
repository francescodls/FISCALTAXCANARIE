// Configurazione API - Usa variabile ambiente (obbligatoria)
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  console.warn('EXPO_PUBLIC_API_URL not set, using default production URL');
}
// TEMPORANEO: Usa preview URL finché produzione non è fixata
export const API_URL = apiUrl || 'https://tribute-models-docs.preview.emergentagent.com';

// Colori del brand - Fiscal Tax Canarie (aggiornati)
export const COLORS = {
  primary: '#2b7c77',        // Nuovo teal corporativo
  primaryDark: '#1d5754',    // Teal scuro
  primaryLight: '#3caca4',   // Teal chiaro
  secondary: '#1e293b',      // Slate scuro
  background: '#f8fafc',     // Sfondo chiaro
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',     // Sfondo alternativo
  text: '#0f172a',           // Testo principale più scuro
  textSecondary: '#64748b',  // Testo secondario
  textLight: '#94a3b8',      // Testo leggero
  border: '#e2e8f0',         // Bordi
  borderDark: '#cbd5e1',     // Bordi più scuri
  success: '#059669',        // Verde successo più saturo
  warning: '#d97706',        // Arancione warning più saturo
  error: '#dc2626',          // Rosso errore più saturo
  info: '#2563eb',           // Blu info più saturo
  accent: '#7c3aed',         // Viola accento
  gold: '#d4af37',           // Oro per premium
};

// Tipografia
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

// Spaziature (aumentate per migliore leggibilità)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius (più consistenti)
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Shadows (più sottili e professionali)
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Timing per animazioni
export const TIMING = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Dimensioni comuni
export const SIZES = {
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 32,
  buttonHeight: 48,
  inputHeight: 48,
  headerHeight: 56,
  tabBarHeight: 80,
};
