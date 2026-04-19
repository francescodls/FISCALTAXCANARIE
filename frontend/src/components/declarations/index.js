/**
 * Componenti e Utilities per la sezione Dichiarazioni
 * Export centralizzato
 */

// Error Boundary
export { default as DeclarationErrorBoundary } from './DeclarationErrorBoundary';

// Hooks per API e Autosave
export { 
  useApiWithRetry, 
  useAutosave, 
  SaveStatusIndicator 
} from './useApiWithRetry';

// Skeleton Loaders
export {
  WizardSkeleton,
  DeclarationListSkeleton,
  AdminDashboardSkeleton,
  DeclarationDetailSkeleton
} from './SkeletonLoaders';

// Validazione Form
export {
  validateField,
  validateSection,
  canSubmitDeclaration,
  ValidatedInput,
  SectionValidationMessage,
  PreSubmitValidation,
  VALIDATION_RULES
} from './FormValidation';
