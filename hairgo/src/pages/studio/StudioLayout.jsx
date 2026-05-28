import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Package, Image, MessageSquare,
  Tag, Users, LogOut, Scissors, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/studio/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/studio/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/studio/products', icon: Package, label: 'Products' },
  { to: '/studio/gallery', icon: Image, label: 'Gallery' },
  { to: '/studio/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/studio/coupons', icon: Tag, label: 'Coupons' },
  { to: '/studio/users', icon: Users, label: 'Users' },
]

export default function StudioLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out from Studio')
    navigate('/studio')
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#C4956A] flex items-center justify-center">
            <Scissors size={14} className="text-black rotate-45" />
          </div>
          <div>
            <span className="font-display text-lg text-white">Hair<span className="text-[#C9A84C]">Go</span></span>
            <span className="block text-[10px] uppercase tracking-widest text-white/25">Studio</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#C9A84C]/15 to-[#C4956A]/10 text-[#C9A84C] border border-[#C9A84C]/15'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-white/30 truncate">{profile?.full_name || 'Admin'}</p>
          <p className="text-[10px] text-[#C9A84C] uppercase tracking-widest mt-0.5">Studio Admin</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0d0d0d] border-r border-white/5 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-60 bg-[#0d0d0d] border-r border-white/5 flex flex-col lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-white/5 bg-[#0d0d0d] flex items-center justify-between px-5 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-white/40 hover:text-white transition-colors">
            <Menu size={18} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/30 uppercase tracking-widest">Live</span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
