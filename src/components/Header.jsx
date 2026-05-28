import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import CartDrawer from './CartDrawer.jsx';

export default function Header() {
  const { user, signOut } = useAuth();
  const { cartCount } = useCart();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobile] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => { setMobile(false); }, [location.pathname]);

  const links = [
    { to: '/',         label: t('nav_home') },
    { to: '/book',     label: t('nav_book') },
    { to: '/shop',     label: t('nav_shop') },
    { to: '/messages', label: t('nav_messages') },
    { to: '/rewards',  label: t('nav_rewards') },
  ];

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <>
      <header style={{
        position: 'fixed',
        inset: '0 0 auto 0',
        zIndex: 40,
        background: 'rgba(26,25,23,0.97)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '68px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}>

          {/* Left: Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '1px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'Roboto', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em', color: 'var(--gold)' }}>HG</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Roboto', fontWeight: 700, fontSize: '12px', letterSpacing: '0.14em', color: '#fff', textTransform: 'uppercase' }}>Hair Go</div>
              <div style={{ fontFamily: 'Roboto', fontWeight: 300, fontSize: '9px', letterSpacing: '0.2em', color: 'var(--text)', textTransform: 'uppercase', marginTop: '1px' }}>Hair Salon</div>
            </div>
          </Link>

          {/* Center: Nav — truly centered */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: '0' }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} style={{
                padding: '0 16px',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isActive(l.to) ? 'var(--gold)' : 'var(--text)',
                textDecoration: 'none',
                lineHeight: '68px',
                borderBottom: isActive(l.to) ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'color 0.2s',
                whiteSpace: 'nowrap',
              }}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <LanguageSwitcher />

            <button onClick={() => setCartOpen(true)} style={{
              position: 'relative', padding: '9px',
              background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
            }}>
              <ShoppingBag size={17} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '15px', height: '15px', background: 'var(--gold)', color: '#1a1917',
                  fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                }}>{cartCount}</span>
              )}
            </button>

            {user ? (
              <div className="hidden sm:flex" style={{ alignItems: 'center' }}>
                <Link to="/profile" style={{ padding: '9px', color: 'var(--text)' }}>
                  <User size={16} strokeWidth={1.5} />
                </Link>
                <button onClick={handleSignOut} style={{ padding: '9px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>
                  <LogOut size={15} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <Link to="/book" className="hidden sm:inline-block" style={{
                padding: '8px 16px', fontSize: '10px', fontWeight: 400,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
                textDecoration: 'none', transition: 'all 0.2s', marginLeft: '4px',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff'; }}
              >
                {t('nav_book')}
              </Link>
            )}

            <button onClick={() => setMobile(v => !v)} className="md:hidden"
              style={{ padding: '9px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', background: '#1a1917', borderTop: '1px solid var(--border)' }}
            >
              <div style={{ padding: '8px 24px 20px' }}>
                {links.map(l => (
                  <Link key={l.to} to={l.to} style={{
                    display: 'block', padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '11px', fontWeight: 400, letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: isActive(l.to) ? 'var(--gold)' : 'var(--text)',
                    textDecoration: 'none',
                  }}>{l.label}</Link>
                ))}
                {user ? (
                  <>
                    <Link to="/profile" style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', textDecoration: 'none' }}>
                      {t('nav_profile')}
                    </Link>
                    <button onClick={handleSignOut} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', fontSize: '11px', fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t('nav_signout')}
                    </button>
                  </>
                ) : (
                  <Link to="/signin" style={{ display: 'block', padding: '12px 0', fontSize: '11px', fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none' }}>
                    {t('nav_signin')}
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div style={{ height: '68px' }} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
