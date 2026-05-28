import { useTranslation } from '../hooks/useTranslation.js';

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center" style={{ border: '1px solid rgba(196,150,42,0.25)' }}>
      {['en', 'ar'].map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: lang === l ? 'var(--gold)' : 'transparent',
            color: lang === l ? 'var(--ink)' : 'rgba(218,214,213,0.4)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            lineHeight: 1,
          }}
        >
          {l === 'en' ? 'EN' : 'ع'}
        </button>
      ))}
    </div>
  );
}
