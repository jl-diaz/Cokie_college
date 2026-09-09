import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../locales/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cokie_lang');
      if (saved === 'es' || saved === 'en') return saved;
      // Auto-detect browser language
      if (navigator?.language && navigator.language.toLowerCase().startsWith('en')) {
        return 'en';
      }
    }
    return 'es';
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'es' ? 'en' : 'es';
      if (typeof window !== 'undefined') {
        localStorage.setItem('cokie_lang', next);
        document.documentElement.lang = next;
      }
      return next;
    });
  }, []);

  const changeLanguage = useCallback((newLang) => {
    if (newLang === 'es' || newLang === 'en') {
      setLang(newLang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cokie_lang', newLang);
        document.documentElement.lang = newLang;
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
      // Refrescar Lenis y GSAP ScrollTrigger tras actualizar dimensiones del texto
      const timer = setTimeout(() => {
        if (window.__lenis) {
          window.__lenis.resize();
        }
        if (window.ScrollTrigger) {
          window.ScrollTrigger.refresh();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [lang]);

  // Función de traducción t('path.to.key', fallback)
  const t = useCallback((path, fallback = '') => {
    const currentDict = translations[lang] || translations.es;
    const parts = path.split('.');
    let cur = currentDict;

    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        // Fallback a español si no existe en inglés
        let fallbackCur = translations.es;
        for (const fp of parts) {
          if (fallbackCur && typeof fallbackCur === 'object' && fp in fallbackCur) {
            fallbackCur = fallbackCur[fp];
          } else {
            return fallback || path;
          }
        }
        return fallbackCur;
      }
    }
    return cur;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe ser utilizado dentro de un LanguageProvider');
  }
  return context;
}
