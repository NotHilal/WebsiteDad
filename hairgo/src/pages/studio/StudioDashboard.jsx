import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Package, Users, MessageSquare, TrendingUp, Clock, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, startOfDay, endOfDay } from 'date-fns'

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#111] border border-white/5 rounded-2xl p-5"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
    </div>
    <div className="font-display text-4xl text-white mb-1">{value}</div>
    <div className="text-xs text-white/30 uppercase tracking-widest">{label}</div>
    {sub && <div className="text-xs text-white/20 mt-1">{sub}</div>}
  </motion.div>
)

export default function StudioDashboard() {
  const [stats, setStats] = useState({ appointments: 0, pending: 0, preorders: 0, users: 0, unreadMessages: 0 })
  const [todayAppts, setTodayAppts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const [{ count: appts }, { count: pending }, { count: preorders }, { count: users }, { count: msgs }, { data: todayList }] = await Promise.all([
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('preorders').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('read', false),
      supabase.from('appointments').select('*, profiles(full_name), services(name), stylists(name)').eq('date', today).order('time'),
    ])
    setStats({ appointments: appts || 0, pending: pending || 0, preorders: preorders || 0, users: users || 0, unreadMessages: msgs || 0 })
    setTodayAppts(todayList || [])
    setLoading(false)
  }

  const statCards = [
    { icon: Calendar, label: 'Total Appointments', value: stats.appointments, sub: `${stats.pending} pending`, color: 'bg-blue-500/10 text-blue-400' },
    { icon: Package, label: 'Active Preorders', value: stats.preorders, sub: 'Awaiting pickup', color: 'bg-[#C9A84C]/10 text-[#C9A84C]' },
    { icon: Users, label: 'Registered Clients', value: stats.users, color: 'bg-[#C4956A]/10 text-[#C4956A]' },
    { icon: MessageSquare, label: 'Unread Messages', value: stats.unreadMessages, color: 'bg-emerald-500/10 text-emerald-400' },
  ]

  const STATUS_MAP = { pending: 'amber', confirmed: 'emerald', cancelled: 'red', completed: 'gray' }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl text-white">Dashboard</h1>
        <p className="text-white/30 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Today's appointments */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Today's Schedule</h2>
          <span className="text-xs text-white/30">{todayAppts.length} appointments</span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
        ) : todayAppts.length === 0 ? (
          <div className="p-8 text-center text-white/25 text-sm">No appointments scheduled for today.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {todayAppts.map(appt => (
              <div key={appt.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-center w-12">
                    <div className="text-sm text-[#C9A84C] font-medium">{appt.time?.slice(0, 5)}</div>
                  </div>
                  <div>
                    <p className="text-white text-sm">{appt.profiles?.full_name || 'Client'}</p>
                    <p className="text-white/35 text-xs">{appt.services?.name} · {appt.stylists?.name}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs capitalize ${
                  appt.status === 'confirmed' ? 'bg-emerald-400/10 text-emerald-400' :
                  appt.status === 'pending' ? 'bg-amber-400/10 text-amber-400' :
                  appt.status === 'cancelled' ? 'bg-red-400/10 text-red-400' :
                  'bg-white/5 text-white/40'
                }`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
