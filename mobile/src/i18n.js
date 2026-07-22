import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

const initI18n = async () => {
  let savedLanguage = 'es';
  try {
    savedLanguage = await AsyncStorage.getItem('language') || 'es';
  } catch (error) {
    console.error('Error loading language', error);
  }

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        en: { translation: enTranslation },
        es: { translation: esTranslation }
      },
      lng: savedLanguage,
      fallbackLng: 'es',
      interpolation: {
        escapeValue: false 
      }
    });
};

initI18n();

export default i18n;
