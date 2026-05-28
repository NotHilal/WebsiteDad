import { useContext } from 'react';
import { LangContext } from '../context/LangContext.jsx';

export function useTranslation() {
  const { lang, t, setLang } = useContext(LangContext);
  return { lang, t, setLang, isRtl: lang === 'ar' };
}
