/**
 * Hook per ottenere colori del tema corrente
 * Semplifica l'utilizzo dei colori dinamici nelle schermate
 */
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../config/constants';

export const useThemedColors = () => {
  const { colors, isDark, mode } = useTheme();
  return { colors, isDark, mode };
};

// Funzione helper per creare stili dinamici
export const createThemedStyles = <T extends Record<string, any>>(
  styleFactory: (colors: typeof COLORS, isDark: boolean) => T
) => {
  return (colors: typeof COLORS, isDark: boolean): T => {
    return styleFactory(colors, isDark);
  };
};

export default useThemedColors;
