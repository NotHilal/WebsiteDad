import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, ArrowUpRight, ChevronRight } from 'lucide-react'
import hairgoLogo from '../../assets/hairgo.png'

const NAV_LINKS = [
  { to: '/',             label: 'Home' },
  { to: '/gallery',      label: 'Gallery' },
  { to: '/appointments', label: 'Book Appointment' },
  { to: '/store',        label: 'Shop Products' },
  { to: '/stylists',     label: 'Our Team' },
]

const CONTACT = [
  { icon: MapPin, text: <>123 Rue de la Beauté<br />Paris, 75001</> },
  { icon: Phone,  text: '+33 1 23 45 67 89' },
  { icon: Mail,   text: 'hello@hairgo.fr' },
]

const HOURS = [
  { day: 'Mon – Fri', time: '9:00 – 19:00', open: true  },
  { day: 'Saturday',  time: '10:00 – 18:00', open: true  },
  { day: 'Sunday',    time: 'Closed',         open: false },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ position: 'relative', background: '#060608', overflow: 'hidden' }}>

      {/* ── Ambient glow ──────────────────────────────── */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 400, background: 'radial-gradient(ellipse at top, rgba(184,212,232,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '10%', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(122,175,201,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Top accent line ───────────────────────────── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(184,212,232,0.22) 25%, rgba(122,175,201,0.28) 50%, rgba(184,212,232,0.22) 75%, transparent 100%)' }} />

      {/* ── Main content ──────────────────────────────── */}
      <div className="footer-main" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 0', position: 'relative' }}>
        <div className="footer-grid" style={{ display: 'grid', gap: 60 }}>

          {/* ── Brand ─────────────────────────────────── */}
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
                <img src={hairgoLogo} alt="HairGo" style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(184,212,232,0.4)', boxShadow: '0 4px 24px rgba(184,212,232,0.35)', flexShrink: 0, objectFit: 'cover' }} />
                <span className="font-display" style={{ fontSize: '1.6rem', color: '#fff', lineHeight: 1, letterSpacing: '0.01em' }}>
                  Hair<span style={{ color: '#B8D4E8' }}>Go</span>
                </span>
              </Link>
              <a href="#" aria-label="Instagram" className="footer-social"
                style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.28)', transition: 'all 0.3s ease', textDecoration: 'none', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>

            <p style={{ fontSize: 13, lineHeight: 2, color: 'rgba(255,255,255,0.22)', maxWidth: 260, marginBottom: 10, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
              Where elegance meets artistry. Premium hair care crafted for those who dare to stand out.
            </p>

            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,#B8D4E8,transparent)' }} />
          </div>

          {/* ── Navigate ──────────────────────────────── */}
          <div className="footer-navigate">
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#B8D4E8', marginBottom: 10, fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>Navigate</h4>
              <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg,rgba(184,212,232,0.5),transparent)' }} />
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="footer-link"
                    style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 300, display: 'inline-flex', alignItems: 'center', gap: 0, transition: 'all 0.25s ease' }}>
                    <ChevronRight size={11} className="footer-link-arrow" style={{ opacity: 0, marginRight: -4, transition: 'all 0.25s ease', color: '#B8D4E8', flexShrink: 0 }} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ───────────────────────────────── */}
          <div className="footer-contact">
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#B8D4E8', marginBottom: 10, fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>Contact</h4>
              <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg,rgba(184,212,232,0.5),transparent)' }} />
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {CONTACT.map(({ icon: Icon, text }, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(184,212,232,0.05)', border: '1px solid rgba(184,212,232,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon size={13} color="rgba(184,212,232,0.7)" strokeWidth={1.5} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.75, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Hours ─────────────────────────────────── */}
          <div className="footer-hours">
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#B8D4E8', marginBottom: 10, fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>Hours</h4>
              <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg,rgba(184,212,232,0.5),transparent)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', marginBottom: 20, maxWidth: 220, width: '100%' }}>
              {HOURS.map(({ day, time, open }, i) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: i < HOURS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: open ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.4)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>{day}</span>
                  </div>
                  <span style={{ fontSize: open ? 12 : 10, color: open ? 'rgba(255,255,255,0.45)' : 'rgba(239,68,68,0.45)', fontFamily: 'Jost, sans-serif', fontWeight: open ? 300 : 500, letterSpacing: open ? '0.02em' : '0.12em', textTransform: open ? 'none' : 'uppercase' }}>{time}</span>
                </div>
              ))}
            </div>

            <Link to="/appointments" className="footer-cta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9999, background: 'linear-gradient(135deg,rgba(184,212,232,0.1),rgba(122,175,201,0.06))', border: '1px solid rgba(184,212,232,0.18)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B8D4E8', textDecoration: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, transition: 'all 0.3s ease' }}>
              Book Now <ArrowUpRight size={11} />
            </Link>
          </div>

        </div>

        {/* ── Bottom bar ──────────────────────────────── */}
        <div className="footer-bottom" style={{ marginTop: 64, paddingTop: 22, paddingBottom: 32, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.13)', letterSpacing: '0.06em', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
            © {year} HairGo. All rights reserved.
          </p>
          <div className="footer-bottom-links" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {['Privacy', 'Terms', 'Cookies'].map((item, i) => (
              <>
                {i > 0 && <span key={`sep-${item}`} style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.08)', display: 'inline-block' }} />}
                <a key={item} href="#" className="footer-legal"
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.13)', textDecoration: 'none', letterSpacing: '0.06em', fontFamily: 'Jost, sans-serif', fontWeight: 300, transition: 'color 0.3s ease', padding: '0 10px' }}>
                  {item}
                </a>
              </>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .footer-grid { grid-template-columns: 1.4fr 0.7fr 1.1fr 1fr; align-items: start; }
        .footer-contact { padding-left: 0; display: flex; flex-direction: column; align-items: center; }
        .footer-navigate { display: flex; flex-direction: column; align-items: center; }
        .footer-hours { display: flex; flex-direction: column; align-items: center; }

        @media (max-width: 1023px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 44px !important; align-items: start; }
        }

        @media (max-width: 639px) {
          .footer-main { padding: 44px 20px 0 !important; }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "brand   brand"
              "nav     contact"
              "hours   hours";
            gap: 32px !important;
            align-items: start;
          }
          .footer-brand    { grid-area: brand; }
          .footer-navigate { grid-area: nav; }
          .footer-contact  { grid-area: contact; }
          .footer-hours    { grid-area: hours; }

          .footer-brand p  { display: none; }
          .footer-brand > a { margin-bottom: 14px !important; }

          .footer-navigate h4,
          .footer-contact h4,
          .footer-hours h4  { margin-bottom: 10px !important; }
          .footer-navigate > div:first-child,
          .footer-contact  > div:first-child,
          .footer-hours    > div:first-child { margin-bottom: 18px !important; }

          .footer-navigate ul { gap: 11px !important; }
          .footer-navigate a  { font-size: 12px !important; }

          .footer-contact ul { gap: 14px !important; }
          .footer-contact li > div { width: 28px !important; height: 28px !important; }
          .footer-contact li span  { font-size: 12px !important; }

          .footer-hours > div:last-of-type { display: none; }
          .footer-cta { display: none !important; }

          .footer-bottom { margin-top: 36px !important; padding-top: 18px !important; padding-bottom: 28px !important; flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .footer-bottom p, .footer-legal { font-size: 10px !important; }
        }

        .footer-social:hover {
          background: rgba(184,212,232,0.1) !important;
          border-color: rgba(184,212,232,0.28) !important;
          color: #B8D4E8 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(184,212,232,0.12);
        }
        .footer-link:hover {
          color: rgba(255,255,255,0.75) !important;
          padding-left: 4px;
        }
        .footer-link:hover .footer-link-arrow {
          opacity: 1 !important;
          margin-right: 4px !important;
        }
        .footer-cta:hover {
          background: linear-gradient(135deg,rgba(184,212,232,0.18),rgba(122,175,201,0.12)) !important;
          border-color: rgba(184,212,232,0.35) !important;
          box-shadow: 0 6px 24px rgba(184,212,232,0.15);
          transform: translateY(-1px);
        }
        .footer-legal:hover { color: rgba(255,255,255,0.42) !important; }
      `}</style>
    </footer>
  )
}
