/**
 * Validazione Form per Dichiarazioni
 * Gestisce validazione inline e feedback visivo
 */

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Regole di validazione per sezione
 */
export const VALIDATION_RULES = {
  dati_personali: {
    required: ['nome', 'cognome', 'codice_fiscale', 'indirizzo', 'email'],
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      codice_fiscale: /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i,
      telefono: /^[+]?[\d\s-]{6,20}$/
    },
    messages: {
      nome: 'Il nome è obbligatorio',
      cognome: 'Il cognome è obbligatorio',
      codice_fiscale: 'Inserisci un codice fiscale o NIE valido',
      indirizzo: 'L\'indirizzo è obbligatorio',
      email: 'Inserisci un\'email valida'
    }
  },
  situazione_familiare: {
    required: ['stato_civile'],
    messages: {
      stato_civile: 'Seleziona lo stato civile'
    }
  },
  redditi_lavoro: {
    required: ['tipo_reddito'],
    messages: {
      tipo_reddito: 'Seleziona il tipo di reddito'
    }
  },
  autorizzazione_firma: {
    required: ['accepted_terms', 'signature'],
    messages: {
      accepted_terms: 'Devi accettare i termini e condizioni',
      signature: 'La firma è obbligatoria'
    }
  }
};

/**
 * Valida un campo singolo
 */
export function validateField(sectionId, fieldName, value) {
  const rules = VALIDATION_RULES[sectionId];
  if (!rules) return { valid: true };

  const errors = [];

  // Check required
  if (rules.required?.includes(fieldName)) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push(rules.messages?.[fieldName] || `${fieldName} è obbligatorio`);
    }
  }

  // Check pattern
  if (value && rules.patterns?.[fieldName]) {
    if (!rules.patterns[fieldName].test(value)) {
      errors.push(rules.messages?.[fieldName] || `${fieldName} non è valido`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un'intera sezione
 */
export function validateSection(sectionId, data) {
  const rules = VALIDATION_RULES[sectionId];
  if (!rules) return { valid: true, errors: {} };

  const errors = {};
  let hasErrors = false;

  // Valida campi required
  rules.required?.forEach(fieldName => {
    const result = validateField(sectionId, fieldName, data?.[fieldName]);
    if (!result.valid) {
      errors[fieldName] = result.errors;
      hasErrors = true;
    }
  });

  // Valida patterns per tutti i campi con valore
  if (rules.patterns) {
    Object.keys(rules.patterns).forEach(fieldName => {
      if (data?.[fieldName] && !errors[fieldName]) {
        const result = validateField(sectionId, fieldName, data[fieldName]);
        if (!result.valid) {
          errors[fieldName] = result.errors;
          hasErrors = true;
        }
      }
    });
  }

  return {
    valid: !hasErrors,
    errors
  };
}

/**
 * Verifica se la dichiarazione può essere inviata
 */
export function canSubmitDeclaration(declaration) {
  const issues = [];

  // Verifica sezioni obbligatorie
  const sections = declaration?.sections || {};
  
  // Dati personali devono essere compilati
  const datiPersonali = sections.dati_personali;
  if (!datiPersonali?.completed && !datiPersonali?.not_applicable) {
    issues.push('Completa la sezione "Dati Personali"');
  }

  // Almeno 50% completamento
  if ((declaration?.completion_percentage || 0) < 50) {
    issues.push('Completa almeno il 50% della dichiarazione');
  }

  // Deve essere firmata
  if (!declaration?.is_signed) {
    issues.push('Firma la dichiarazione');
  }

  return {
    canSubmit: issues.length === 0,
    issues
  };
}

/**
 * Componente Input con validazione inline
 */
export function ValidatedInput({
  value,
  onChange,
  sectionId,
  fieldName,
  showValidation = false,
  className = '',
  ...props
}) {
  const [touched, setTouched] = React.useState(false);
  const validation = React.useMemo(() => {
    if (!touched && !showValidation) return { valid: true };
    return validateField(sectionId, fieldName, value);
  }, [sectionId, fieldName, value, touched, showValidation]);

  const isInvalid = !validation.valid;

  return (
    <div className="relative">
      <input
        value={value || ''}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        className={`
          w-full p-2 border rounded-lg transition-colors
          ${isInvalid 
            ? 'border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500' 
            : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
          }
          ${className}
        `}
        {...props}
      />
      {isInvalid && validation.errors?.[0] && (
        <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {validation.errors[0]}
        </div>
      )}
      {!isInvalid && touched && value && (
        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
      )}
    </div>
  );
}

/**
 * Componente messaggio validazione sezione
 */
export function SectionValidationMessage({ sectionId, data, showOnlyErrors = true }) {
  const validation = validateSection(sectionId, data);
  
  if (validation.valid && showOnlyErrors) return null;

  return (
    <div className={`p-3 rounded-lg ${validation.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      {validation.valid ? (
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>Sezione compilata correttamente</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <AlertCircle className="w-5 h-5" />
            <span>Campi da completare:</span>
          </div>
          <ul className="list-disc list-inside text-sm text-red-600 ml-6">
            {Object.entries(validation.errors).map(([field, errors]) => (
              <li key={field}>{errors[0]}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Componente riepilogo validazione pre-invio
 */
export function PreSubmitValidation({ declaration, onClose }) {
  const { canSubmit, issues } = canSubmitDeclaration(declaration);

  return (
    <div className={`p-4 rounded-lg border ${canSubmit ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      {canSubmit ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Pronto per l'invio!</p>
            <p className="text-sm text-green-700">La dichiarazione è completa e può essere inviata.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Operazioni richieste prima dell'invio:</p>
            </div>
          </div>
          <ul className="space-y-2 ml-9">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-2 text-amber-700">
                <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default {
  validateField,
  validateSection,
  canSubmitDeclaration,
  ValidatedInput,
  SectionValidationMessage,
  PreSubmitValidation,
  VALIDATION_RULES
};
