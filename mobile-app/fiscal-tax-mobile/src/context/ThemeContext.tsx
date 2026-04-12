import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textLight: string;
  border: string;
  borderDark: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  accent: string;
  gold: string;
  // Dark mode specific
  card: string;
  notification: string;
}

const lightColors: ThemeColors = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryLight: '#14b8a6',
  secondary: '#1e293b',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  border: '#e2e8f0',
  borderDark: '#cbd5e1',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
  accent: '#7c3aed',
  gold: '#d4af37',
  card: '#ffffff',
  notification: '#dc2626',
};

const darkColors: ThemeColors = {
  primary: '#14b8a6',
  primaryDark: '#0d9488',
  primaryLight: '#2dd4bf',
  secondary: '#e2e8f0',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textLight: '#64748b',
  border: '#334155',
  borderDark: '#475569',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#f87171',
  info: '#60a5fa',
  accent: '#a78bfa',
  gold: '#fbbf24',
  card: '#1e293b',
  notification: '#f87171',
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
  toggleMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error('[Theme] Error loading preference:', error);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('[Theme] Error saving preference:', error);
    }
  };

  const toggleMode = () => {
    if (mode === 'system') {
      setMode(systemColorScheme === 'dark' ? 'light' : 'dark');
    } else {
      setMode(mode === 'dark' ? 'light' : 'dark');
    }
  };

  // Determine if dark mode is active
  const isDark = mode === 'system' 
    ? systemColorScheme === 'dark'
    : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Hook per ottenere stili dinamici basati sul tema
export const useThemedStyles = <T extends Record<string, any>>(
  styleFactory: (colors: ThemeColors, isDark: boolean) => T
): T => {
  const { colors, isDark } = useTheme();
  return styleFactory(colors, isDark);
};

export { lightColors, darkColors };
export type { ThemeColors };
