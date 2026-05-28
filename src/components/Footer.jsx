import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.js';

export default function Footer() {
  const { lang } = useTranslation();

  const colHeading = (text) => (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ color: '#ffffff', fontWeight: 400, fontSize: '16px', marginBottom: '10px' }}>{text}</h4>
      <div style={{ width: '36px', height: '2px', background: 'var(--gold)' }} />
    </div>
  );

  return (
    <footer
      style={{
        background: 'var(--bg-alt)',
        borderTop: '1px solid var(--border)',
        backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.012) 0, rgba(255,255,255,0.012) 1px, transparent 0, transparent 50%)',
        backgroundSize: '6px 6px',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">

          {/* Navigation */}
          <div>
            {colHeading(lang === 'ar' ? 'التنقل' : 'Navigation')}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                { to: '/',         en: 'Home',     ar: 'الرئيسية' },
                { to: '/book',     en: 'Book',     ar: 'احجز' },
                { to: '/shop',     en: 'Shop',     ar: 'المتجر' },
                { to: '/rewards',  en: 'Rewards',  ar: 'المكافآت' },
                { to: '/messages', en: 'Contact',  ar: 'تواصل معنا' },
              ].map(l => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    style={{
                      fontSize: '13px',
                      fontWeight: 300,
                      color: 'var(--text)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
                  >
                    {lang === 'ar' ? l.ar : l.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Contacts */}
          <div>
            {colHeading(lang === 'ar' ? 'تواصل معنا' : 'Our Contacts')}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li style={{ fontSize: '13px', fontWeight: 300, color: 'var(--text)' }}>Whangaparāoa, Auckland</li>
              <li style={{ fontSize: '13px', fontWeight: 300, color: 'var(--text)' }}>New Zealand</li>
              <li style={{ marginTop: '4px' }}>
                <a href="tel:+6490000000" style={{ fontSize: '13px', fontWeight: 300, color: 'var(--text)', textDecoration: 'none', transition: 'color 0.2s' }}
                   onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; }}
                   onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}>
                  +64 9 XXX XXXX
                </a>
              </li>
              <li>
                <a href="mailto:hello@hairgo.co.nz" style={{ fontSize: '13px', fontWeight: 300, color: 'var(--gold)', textDecoration: 'none' }}>
                  hello@hairgo.co.nz
                </a>
              </li>
            </ul>
          </div>

          {/* All Services */}
          <div>
            {colHeading(lang === 'ar' ? 'خدماتنا' : 'All Services')}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                { en: 'Haircut',    ar: 'قص الشعر' },
                { en: 'Colour',     ar: 'الصبغ' },
                { en: 'Highlights', ar: 'هايلايت' },
                { en: 'Keratin',    ar: 'كيراتين' },
                { en: 'Blowout',    ar: 'تمليس' },
                { en: 'Treatment',  ar: 'علاج الشعر' },
              ].map(s => (
                <li key={s.en}>
                  <Link
                    to="/book"
                    style={{ fontSize: '13px', fontWeight: 300, color: 'var(--text)', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
                  >
                    {lang === 'ar' ? s.ar : s.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            {colHeading(lang === 'ar' ? 'ساعات العمل' : 'Opening Hours')}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                { en: 'Mon – Fri',    ar: 'الاثنين – الجمعة', time: '9:00am – 7:00pm' },
                { en: 'Saturday',     ar: 'السبت',            time: '9:00am – 6:00pm' },
                { en: 'Sunday',       ar: 'الأحد',            time: '10:00am – 5:00pm' },
              ].map(h => (
                <li key={h.en} style={{ fontSize: '13px', fontWeight: 300, color: 'var(--text)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{lang === 'ar' ? h.ar : h.en}</span>
                  <br />
                  <span style={{ color: 'var(--gold)', fontSize: '12px' }}>{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 0' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-12 flex items-center justify-between">
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 300 }}>
            © {new Date().getFullYear()} Hair Go. All Rights Reserved.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 300 }}>
            Whangaparāoa, NZ
          </p>
        </div>
      </div>
    </footer>
  );
}
