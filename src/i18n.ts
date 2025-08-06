// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslation from './locales/en/translation.json';
import ptTranslation from './locales/pt/translation.json';

// Get language from localStorage or detect system language
const getInitialLanguage = (): string => {
  try {
    const savedLanguage = localStorage.getItem('orch-mind-language');
    if (savedLanguage && ['en', 'pt'].includes(savedLanguage)) {
      return savedLanguage;
    }
  } catch (error) {
    console.warn('Failed to get language from localStorage:', error);
  }
  
  // Detect system language if no saved language
  try {
    const systemLanguage = navigator.language || navigator.languages?.[0] || 'en';
    // If system language is Portuguese (pt or pt-BR), use 'pt', otherwise use 'en'
    return systemLanguage.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  } catch (error) {
    console.warn('Failed to detect system language:', error);
    return 'en';
  }
};

// Save language to localStorage
const saveLanguage = (language: string): void => {
  try {
    localStorage.setItem('orch-mind-language', language);
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      pt: {
        translation: ptTranslation,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'pt',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Save language changes to localStorage
    saveMissing: false,
    
    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],
  });

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  saveLanguage(lng);
});

export default i18n;

// Export helper functions
export { getInitialLanguage, saveLanguage };