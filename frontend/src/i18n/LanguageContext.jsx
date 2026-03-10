import { createContext, useContext, useState, useEffect } from "react";
import { translations, languageOptions, getTranslation } from "./translations";

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get initial language from localStorage or default to Italian
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem("fiscaltax_language");
    return saved && ["it", "en", "es"].includes(saved) ? saved : "it";
  });

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("fiscaltax_language", language);
  }, [language]);

  const setLanguage = (lang) => {
    if (["it", "en", "es"].includes(lang)) {
      setLanguageState(lang);
    }
  };

  // Translation function
  const t = (path) => {
    return getTranslation(language, path);
  };

  const value = {
    language,
    setLanguage,
    t,
    translations: translations[language],
    languageOptions,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;
