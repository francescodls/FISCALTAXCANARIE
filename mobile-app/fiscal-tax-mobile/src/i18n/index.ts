export { it, TranslationKeys } from './it';
export { es } from './es';
export { en } from './en';

export type Language = 'it' | 'es' | 'en';

export const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];
