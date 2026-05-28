import { createContext, useState, useEffect } from 'react';
import en from '../locales/en.js';
import ar from '../locales/ar.js';

const LOCALES = { en, ar };

export const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('hg_lang') || 'en');

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('hg_lang', l);
  };

  useEffect(() => {
    const isRtl = lang === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = (key) => LOCALES[lang]?.[key] ?? LOCALES['en']?.[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
