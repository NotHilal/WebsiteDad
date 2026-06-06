import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, User, LogOut, Scissors, MessageCircle, Star, ChevronDown, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import toast from 'react-hot-toast'

const BASE_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/gallery', label: 'Gallery' },
  { to: '/appointments', label: 'Book' },
  { to: '/store', label: 'Store' },
  { to: '/stylists', label: 'Our Team' },
]

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [profileOpen, setProfile]   = useState(false)
  const { user, profile, signOut }  = useAuth()
  const { cartCount }               = useCart()
  const navigate                    = useNavigate()
  const links = user
    ? [...BASE_LINKS, { to: '/chat', label: 'Messages' }]
    : BASE_LINKS
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchUnread()
    const sub = supabase.channel(`navbar-unread-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, fetchUnread)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  async function fetchUnread() {
    const { data: myTickets } = await supabase.from('tickets').select('id').eq('user_id', user.id)
    const ids = (myTickets || []).map(t => t.id)
    if (!ids.length) return setUnread(0)
    const { count } = await supabase
      .from('ticket_messages').select('*', { count: 'exact', head: true })
      .in('ticket_id', ids).eq('is_from_admin', true).eq('read', false)
    setUnread(count || 0)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  async function handleSignOut() {
    await signOut()
    setProfile(false)
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <>
      {/* ── Floating header bar ─────────────────────────────── */}
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          top: 5,
          left: 16,
          right: 16,
          zIndex: 50,
          borderRadius: 18,
          transition: 'background 0.4s, box-shadow 0.4s, border-color 0.4s',
          background: scrolled
            ? 'rgba(10, 10, 10, 0.88)'
            : 'rgba(10, 10, 10, 0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: scrolled
            ? '1px solid rgba(201, 168, 76, 0.18)'
            : '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: scrolled
            ? '0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(201,168,76,0.08) inset'
            : '0 4px 24px rgba(0,0,0,0.25)',
          padding: '0 1.5rem',
          height: 58,
        }}
      >
        {/* 3-col grid: logo | nav | auth */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: '100%', maxWidth: 1280, margin: '0 auto' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', width: 'fit-content' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C9A84C, #C4956A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(201,168,76,0.4)',
              flexShrink: 0,
            }}>
              <Scissors size={13} color="#000" style={{ transform: 'rotate(45deg)' }} />
            </div>
            <span className="font-display" style={{ fontSize: '1.45rem', letterSpacing: '0.02em', color: '#fff', lineHeight: 1 }}>
              Hair<span style={{ color: '#C9A84C' }}>Go</span>
            </span>
          </Link>

          {/* Nav links — center */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
            {links.map(({ to, label, exact }) => (
              <NavLink key={to} to={to} end={exact}
                style={({ isActive }) => ({
                  fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.52)',
                  textDecoration: 'none', position: 'relative',
                  transition: 'color 0.3s',
                  fontFamily: 'Jost, sans-serif', fontWeight: 400,
                })}
                className="nav-link"
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {to === '/chat' && unread > 0 && (
                      <span style={{ position: 'absolute', top: -3, right: -8, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                    )}
                    <span style={{
                      position: 'absolute', bottom: -4, left: 0,
                      height: 1,
                      width: isActive ? '100%' : '0%',
                      background: 'linear-gradient(90deg, #C9A84C, #C4956A)',
                      transition: 'width 0.35s ease',
                      display: 'block',
                    }} className="nav-underline" />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Auth — right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }} className="hidden-mobile">
            {user && (
              <Link to="/profile" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: cartCount > 0 ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cartCount > 0 ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.3s', textDecoration: 'none' }}
                onClick={() => {}}>
                <ShoppingCart size={13} color={cartCount > 0 ? '#C9A84C' : 'rgba(255,255,255,0.4)'} />
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#C9A84C', color: '#000', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Jost, sans-serif' }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setProfile(!profileOpen)} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 14px 7px 9px', borderRadius: 9999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  cursor: 'pointer', transition: 'border-color 0.3s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#C9A84C,#C4956A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(201,168,76,0.35)', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#000', lineHeight: 1 }}>
                      {profile?.full_name?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: 'Jost,sans-serif' }}>
                    {profile?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown size={11} color="rgba(255,255,255,0.3)" style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 220, background: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}
                    >
                      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 4, fontFamily: 'Jost,sans-serif' }}>Signed in as</p>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                        {(profile?.points || 0) > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                            <Star size={10} color="#C9A84C" />
                            <span style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'Jost,sans-serif' }}>{profile.points} visit{profile.points !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '6px 0' }}>
                        {[
                          { to: '/profile', icon: User, label: 'My Profile' },
                          { to: '/chat', icon: MessageCircle, label: 'Messages' },
                        ].map(({ to, icon: Icon, label: lbl }) => (
                          <Link key={to} to={to} onClick={() => setProfile(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s, background 0.2s', fontFamily: 'Jost,sans-serif' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent' }}>
                            <Icon size={13} />{lbl}
                          </Link>
                        ))}
                        <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s, background 0.2s', fontFamily: 'Jost,sans-serif' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.9)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.6)'; e.currentTarget.style.background = 'transparent' }}>
                          <LogOut size={13} />Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Link to="/login" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontFamily: 'Jost,sans-serif', transition: 'color 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}>
                  Sign In
                </Link>
                <Link to="/register" className="btn-gold" style={{ padding: '9px 22px', fontSize: 11 }}>
                  Join
                </Link>
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gridColumn: 3 }} className="show-mobile">
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ padding: 8, color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
              onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50, width: 280, background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="font-display" style={{ fontSize: '1.3rem', color: '#fff' }}>Hair<span style={{ color: '#C9A84C' }}>Go</span></span>
                <button onClick={() => setMenuOpen(false)} style={{ padding: 6, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {links.map(({ to, label, exact }) => (
                  <NavLink key={to} to={to} end={exact} onClick={() => setMenuOpen(false)}
                    style={({ isActive }) => ({
                      padding: '12px 16px', borderRadius: 12, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.45)',
                      background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                      border: isActive ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
                      textDecoration: 'none', fontFamily: 'Jost,sans-serif', transition: 'all 0.2s',
                    })}>
                    {label}
                  </NavLink>
                ))}
              </nav>

              <div style={{ padding: '1.25rem 1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontFamily: 'Jost,sans-serif' }}>
                      <User size={13} />Profile
                    </Link>
                    <button onClick={() => { handleSignOut(); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif' }}>
                      <LogOut size={13} />Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontFamily: 'Jost,sans-serif' }}>
                      Sign In
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ width: '100%' }}>
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {profileOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setProfile(false)} />}

      <style>{`
        @media (min-width: 1024px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile   { display: none  !important; }
        }
        @media (max-width: 1023px) {
          .hidden-mobile { display: none  !important; }
          .show-mobile   { display: flex  !important; }
        }
        .nav-link:hover .nav-underline { width: 100% !important; }
      `}</style>
    </>
  )
}
