import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, CalendarOff, Package, Image, MessageSquare,
  Tag, Users, UserCheck, LogOut, Scissors, Menu, BarChart2, ClipboardList, ShoppingBag, Sparkles, Clock, Banknote, QrCode
} from 'lucide-react'
import AppointmentAlert from '../../components/AppointmentAlert'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const C = {
  bg: '#0e0e14', card: '#161620', sidebar: '#0a0a10', topbar: '#111118',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)', danger: '#f87171',
}

const adminNavItems = [
  { to: '/studio/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/studio/sales',         icon: BarChart2,       label: 'Sales' },
  { to: '/studio/appointments',  icon: ClipboardList,   label: 'Appointments' },
  { to: '/studio/schedule',      icon: Calendar,        label: 'Schedule' },
  { to: '/studio/blocked-dates', icon: CalendarOff,     label: 'Blocked Dates' },
  { to: '/studio/messages',      icon: MessageSquare,   label: 'Messages' },
  { to: '/studio/orders',        icon: ShoppingBag,     label: 'Orders' },
  { to: '/studio/timesheets',    icon: Clock,           label: 'Timesheets' },
  { to: '/studio/kiosk',         icon: QrCode,          label: 'Kiosk' },
  { to: '/studio/pay-runs',      icon: Banknote,        label: 'Pay Runs' },
  { to: '/studio/home-display',  icon: Sparkles,        label: 'Home Display' },
  { to: '/studio/services',      icon: Scissors,        label: 'Services' },
  { to: '/studio/stylists',      icon: UserCheck,       label: 'Stylists' },
  { to: '/studio/products',      icon: Package,         label: 'Products' },
  { to: '/studio/gallery',       icon: Image,           label: 'Gallery' },
  { to: '/studio/coupons',       icon: Tag,             label: 'Coupons' },
  { to: '/studio/users',         icon: Users,           label: 'Users' },
]

const workerNavItems = [
  { to: '/studio/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/studio/appointments',  icon: ClipboardList,   label: 'Appointments' },
  { to: '/studio/schedule',      icon: Calendar,        label: 'Schedule' },
  { to: '/studio/blocked-dates', icon: CalendarOff,     label: 'Blocked Dates' },
  { to: '/studio/messages',      icon: MessageSquare,   label: 'Messages' },
  { to: '/studio/orders',        icon: ShoppingBag,     label: 'Orders' },
  { to: '/studio/timesheets',    icon: Clock,           label: 'Timesheets' },
  { to: '/studio/paysheet',      icon: Banknote,        label: 'Paysheet' },
]

export default function StudioLayout() {
  const [open,         setOpen]         = useState(false)
  const [unread,       setUnread]       = useState(0)
  const { signOut, profile, isAdmin } = useAuth()

  useEffect(() => {
    fetchUnread()
    const sub = supabase.channel('studio-unread-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, fetchUnread)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function fetchUnread() {
    const { count } = await supabase
      .from('ticket_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_from_admin', false)
      .eq('read', false)
    setUnread(count || 0)
  }
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = isAdmin ? adminNavItems : workerNavItems
  const currentPage = navItems.find(n => location.pathname.startsWith(n.to))?.label ?? 'Studio'

  async function handleSignOut() {
    sessionStorage.removeItem('studio_access')
    await signOut()
    toast.success('Signed out')
    navigate('/studio')
  }

  const Sidebar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div className="s-brand-wrap" style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', opacity: 1, transition: 'opacity .18s' }}
          className="s-brand">
          <div className="s-logo-circle" style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},#C4956A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px rgba(201,168,76,0.3)` }}>
            <Scissors size={13} color="#000" style={{ transform: 'rotate(45deg)' }} />
          </div>
          <div>
            <span className="font-display s-brand-name" style={{ fontSize: '1.15rem', color: C.white, lineHeight: 1 }}>
              Hair<span style={{ color: C.gold }}>Go</span>
            </span>
            <span style={{ display: 'block', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: 2 }}>
              Studio
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="s-nav-list" style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.55rem 0.875rem', borderRadius: 10,
              fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: isActive ? 500 : 400,
              color: isActive ? C.gold : C.dim,
              background: isActive ? C.goldBg : 'transparent',
              border: isActive ? `1px solid ${C.goldBorder}` : '1px solid transparent',
              textDecoration: 'none', transition: 'all .18s ease',
            })}
            className="s-nav">
            {({ isActive }) => (
              <>
                <Icon size={14} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                {label}
                {label === 'Messages' && unread > 0 && (
                  <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, padding: '0 4px' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="s-footer-wrap" style={{ padding: '0.75rem 0.625rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ padding: '0.5rem 0.875rem', marginBottom: 6 }}>
          <p style={{ fontSize: '0.78rem', color: C.dim, fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.full_name || 'Admin'}
          </p>
          <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', marginTop: 2 }}>
            {isAdmin ? 'Studio Admin' : 'Employee'}
          </p>
        </div>
        <button onClick={handleSignOut} className="s-signout"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '0.5rem 0.875rem', borderRadius: 10, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', color: 'rgba(248,113,113,0.5)', background: 'none', border: `1px solid rgba(248,113,113,0.12)`, cursor: 'pointer', transition: 'all .18s ease', textAlign: 'left' }}>
          <LogOut size={13} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: C.bg, overflow: 'hidden' }}>

      <aside style={{ width: 210, flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}` }} className="hidden lg:block">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}
              className="lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -210 }} animate={{ x: 0 }} exit={{ x: -210 }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: 210, background: C.sidebar, borderRight: `1px solid ${C.border}` }}
              className="lg:hidden">
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 50, flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.topbar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setOpen(true)} style={{ display: 'none', padding: 4, color: C.dim, background: 'none', border: 'none', cursor: 'pointer' }} className="lg:hidden s-menu-btn">
              <Menu size={17} />
            </button>
            <span style={{ fontSize: '0.8rem', color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.04em' }}>{currentPage}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AppointmentAlert />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.14)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} className="animate-pulse" />
              <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#34d399', fontFamily: 'Jost,sans-serif' }}>Live</span>
            </div>
          </div>
        </header>

        <main className="studio-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1.75rem 2rem' }}>
          <div className="studio-outlet" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .s-brand:hover { opacity: 0.75 !important; }
        .s-nav:hover { color: ${C.white} !important; background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.06) !important; }
        .s-signout:hover { color: ${C.danger} !important; border-color: rgba(248,113,113,0.28) !important; background: rgba(248,113,113,0.06) !important; }
        .s-menu-btn { display: flex !important; }
        @media (min-width: 1024px) { .s-menu-btn { display: none !important; } }
        @media (max-width: 1023px) {
          .studio-main { padding: 0.875rem !important; }
          .studio-outlet { overflow-y: auto !important; }
          .s-brand-wrap { padding: 0.75rem 1rem !important; }
          .s-logo-circle { width: 26px !important; height: 26px !important; }
          .s-brand-name { font-size: 1rem !important; }
          .s-nav-list { padding: 0.4rem 0.5rem !important; gap: 1px !important; }
          .s-nav { padding: 0.38rem 0.75rem !important; font-size: 0.78rem !important; }
          .s-footer-wrap { padding: 0.5rem 0.5rem !important; }
        }
      `}</style>
    </div>
  )
}
