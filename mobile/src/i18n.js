import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

// Initialize synchronously first with default language 'es' so components never render before i18n is ready
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: enTranslation },
      es: { translation: esTranslation }
    },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false 
    }
  });

// Asynchronously load user language preference from AsyncStorage
AsyncStorage.getItem('language')
  .then(savedLanguage => {
    if (savedLanguage && savedLanguage !== 'es') {
      i18n.changeLanguage(savedLanguage);
    }
  })
  .catch(error => {
    console.error('Error loading language preference:', error);
  });

export default i18n;
