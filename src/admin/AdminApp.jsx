import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, MessageSquare, Users, Tag, LogOut, Scissors } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminAppointments from './AdminAppointments.jsx';
import AdminMessages from './AdminMessages.jsx';
import AdminClients from './AdminClients.jsx';
import AdminCoupons from './AdminCoupons.jsx';

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || 'hg-portal';

export default function AdminApp() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Guard: not admin → 404
  if (!user || profile === null) return null;
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const nav = [
    { to: `/${ADMIN_ROUTE}/dashboard`,    label: 'Dashboard',     icon: LayoutDashboard },
    { to: `/${ADMIN_ROUTE}/appointments`, label: 'Appointments',  icon: CalendarDays },
    { to: `/${ADMIN_ROUTE}/messages`,     label: 'Messages',      icon: MessageSquare },
    { to: `/${ADMIN_ROUTE}/clients`,      label: 'Clients',       icon: Users },
    { to: `/${ADMIN_ROUTE}/coupons`,      label: 'Coupons',       icon: Tag },
  ];

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0F0D0A' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r py-6 px-3"
             style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0F0D0A' }}>
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--gold)' }}>
            <Scissors size={14} color="var(--ink)" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>Hair Go</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Admin Portal</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'font-medium' : 'hover:bg-white/5'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(201,169,97,0.15)' : 'transparent',
                color:      isActive ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
              })}
            >
              <item.icon size={16} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t pt-4 px-3 mt-4 space-y-1"
             style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {profile.email}
          </div>
          <button onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm w-full px-0 py-1 hover:opacity-70 transition-opacity"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="dashboard"    element={<AdminDashboard />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="messages"     element={<AdminMessages />} />
          <Route path="clients"      element={<AdminClients />} />
          <Route path="coupons"      element={<AdminCoupons />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
