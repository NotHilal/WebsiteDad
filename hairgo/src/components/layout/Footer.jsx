import { Link } from 'react-router-dom'
import { Scissors, MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ position: 'relative', background: '#060606' }}>

      {/* ── Top gradient line ──────────────────────────── */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3) 30%, rgba(196,149,106,0.3) 70%, transparent)',
      }} />

      {/* ── Main grid ─────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px 0' }}>
        <div className="footer-grid" style={{ display: 'grid', gap: 56 }}>

          {/* ── Brand column ───────────────────────────── */}
          <div>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 20 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #C9A84C, #C4956A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
              }}>
                <Scissors size={14} color="#000" style={{ transform: 'rotate(45deg)' }} />
              </div>
              <span className="font-display" style={{ fontSize: '1.5rem', color: '#fff', lineHeight: 1 }}>
                Hair<span style={{ color: '#C9A84C' }}>Go</span>
              </span>
            </Link>
            <p style={{
              fontSize: 13, lineHeight: 1.85, color: 'rgba(255,255,255,0.25)',
              maxWidth: 280, marginBottom: 28,
              fontFamily: 'Jost, sans-serif', fontWeight: 300,
            }}>
              Where elegance meets artistry. Premium hair care crafted for those who dare to stand out.
            </p>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { icon: () => (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                ), label: 'Instagram', href: '#' },
                { icon: () => (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                ), label: 'TikTok', href: '#' },
              ].map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} aria-label={label}
                  className="footer-social-icon"
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.3)',
                    transition: 'all 0.35s ease',
                    textDecoration: 'none',
                  }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* ── Navigate column ────────────────────────── */}
          <div>
            <h4 style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#C9A84C', marginBottom: 28, fontFamily: 'Jost, sans-serif', fontWeight: 500,
            }}>Navigate</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { to: '/', label: 'Home' },
                { to: '/gallery', label: 'Gallery' },
                { to: '/appointments', label: 'Book Appointment' },
                { to: '/store', label: 'Shop Products' },
                { to: '/stylists', label: 'Our Team' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}
                    className="footer-link"
                    style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.3)',
                      textDecoration: 'none', transition: 'color 0.3s ease',
                      fontFamily: 'Jost, sans-serif', fontWeight: 300,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact column ─────────────────────────── */}
          <div>
            <h4 style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#C9A84C', marginBottom: 28, fontFamily: 'Jost, sans-serif', fontWeight: 500,
            }}>Contact</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { icon: MapPin, text: <>123 Rue de la Beauté<br />Paris, 75001</> },
                { icon: Phone, text: '+33 1 23 45 67 89' },
                { icon: Mail, text: 'hello@hairgo.fr' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <Icon size={13} color="#C9A84C" strokeWidth={1.5} />
                  </div>
                  <span style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.3)',
                    lineHeight: 1.7, fontFamily: 'Jost, sans-serif', fontWeight: 300,
                  }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Hours column ───────────────────────────── */}
          <div>
            <h4 style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#C9A84C', marginBottom: 28, fontFamily: 'Jost, sans-serif', fontWeight: 500,
            }}>Hours</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { day: 'Mon – Fri', time: '9:00 – 19:00' },
                { day: 'Saturday', time: '10:00 – 18:00' },
                { day: 'Sunday', time: 'Closed' },
              ].map(({ day, time }) => (
                <li key={day} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 14,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'Jost, sans-serif', fontWeight: 300,
                  }}>{day}</span>
                  <span style={{
                    fontSize: 12,
                    color: time === 'Closed' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.5)',
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: time === 'Closed' ? 400 : 300,
                    letterSpacing: time === 'Closed' ? '0.12em' : '0.04em',
                    textTransform: time === 'Closed' ? 'uppercase' : 'none',
                    fontSize: time === 'Closed' ? 10 : 13,
                  }}>{time}</span>
                </li>
              ))}
            </ul>

            {/* Book CTA */}
            <Link to="/appointments"
              className="footer-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: 24, padding: '10px 20px',
                borderRadius: 9999,
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.15)',
                fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#C9A84C', textDecoration: 'none',
                fontFamily: 'Jost, sans-serif', fontWeight: 400,
                transition: 'all 0.35s ease',
              }}>
              Book Now
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────── */}
        <div style={{
          marginTop: 64, paddingTop: 24, paddingBottom: 32,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
        }}>
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.15)',
            letterSpacing: '0.06em', fontFamily: 'Jost, sans-serif', fontWeight: 300,
          }}>
            © {year} HairGo. All rights reserved.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {['Privacy', 'Terms', 'Cookies'].map((item) => (
              <a key={item} href="#"
                className="footer-legal"
                style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.15)',
                  textDecoration: 'none', letterSpacing: '0.06em',
                  fontFamily: 'Jost, sans-serif', fontWeight: 300,
                  transition: 'color 0.3s ease',
                }}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hover styles ──────────────────────────────── */}
      <style>{`
        .footer-grid {
          grid-template-columns: 1.4fr 0.8fr 1fr 1fr;
        }
        @media (max-width: 1023px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 40px !important;
          }
        }
        @media (max-width: 639px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 36px !important;
          }
        }
        .footer-social-icon:hover {
          background: rgba(201,168,76,0.1) !important;
          border-color: rgba(201,168,76,0.25) !important;
          color: #C9A84C !important;
          transform: translateY(-2px);
        }
        .footer-link:hover {
          color: rgba(255,255,255,0.7) !important;
        }
        .footer-cta:hover {
          background: rgba(201,168,76,0.14) !important;
          border-color: rgba(201,168,76,0.3) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(201,168,76,0.12);
        }
        .footer-legal:hover {
          color: rgba(255,255,255,0.45) !important;
        }
      `}</style>
    </footer>
  )
}
