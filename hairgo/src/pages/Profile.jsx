import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Package, Tag, Star, Check, Clock, X, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Appointments', 'Preorders', 'Rewards']

const STATUS = {
  pending:   'text-amber-400  bg-amber-400/10  border-amber-400/20',
  confirmed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  cancelled: 'text-red-400    bg-red-400/10    border-red-400/20',
  completed: 'text-[#C9A84C]  bg-[#C9A84C]/10  border-[#C9A84C]/20',
  active:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  expired:   'text-red-400/55 bg-red-400/5     border-red-400/10',
}

export default function Profile() {
  const { user, profile, fetchProfile } = useAuth()
  const [tab, setTab] = useState('Overview')
  const [appointments, setAppointments] = useState([])
  const [preorders, setPreorders] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState(profile?.full_name || '')

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    const [{ data: appts }, { data: orders }, { data: ucoupons }] = await Promise.all([
      supabase.from('appointments').select('*, stylists(name), services(name,price)').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('preorders').select('*, products(name,image_url,price)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_coupons').select('*, coupons(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setAppointments(appts || [])
    setPreorders(orders || [])
    setCoupons(ucoupons || [])
    setLoading(false)
  }

  async function saveName() {
    await supabase.from('profiles').update({ full_name: nameInput }).eq('id', user.id)
    await fetchProfile(user.id)
    setEditName(false)
    toast.success('Name updated')
  }

  const pts = profile?.points || 0
  const tier = pts >= 500 ? 'Gold' : pts >= 200 ? 'Silver' : 'Bronze'
  const nextTier = pts >= 500 ? null : pts >= 200 ? { name: 'Gold', at: 500 } : { name: 'Silver', at: 200 }
  const progress = nextTier ? Math.min(100, (pts / nextTier.at) * 100) : 100

  return (
    <div className="min-h-screen pt-32 pb-32 px-6">
      <div className="w-full max-w-3xl mx-auto">

        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6 mb-14">
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#C4956A] flex items-center justify-center text-black font-bold text-2xl shadow-[0_8px_32px_rgba(201,168,76,0.35)]"
            style={{ width: 72, height: 72 }}>
            {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            {editName ? (
              <div className="flex items-center gap-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                  className="bg-transparent border-b border-[#C9A84C]/50 text-white text-2xl focus:outline-none pb-0.5 font-display" autoFocus />
                <button onClick={saveName} className="text-[#C9A84C] hover:text-[#E8D5A3]"><Check size={16} /></button>
                <button onClick={() => setEditName(false)} className="text-white/25 hover:text-white"><X size={16} /></button>
              </div>
            ) : (
              <button onClick={() => { setEditName(true); setNameInput(profile?.full_name || '') }}
                className="flex items-center gap-2 group">
                <span className="font-display text-3xl text-white group-hover:text-[#C9A84C] transition-colors">
                  {profile?.full_name || 'Your Name'}
                </span>
                <Edit2 size={14} className="text-white/20 group-hover:text-[#C9A84C]/60 transition-colors" />
              </button>
            )}
            <p className="text-white/35 text-sm mt-1">{user?.email}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] whitespace-nowrap transition-all duration-300 ${
                tab === t ? 'btn-gold' : 'btn-outline'
              }`}
              style={tab === t ? {} : { padding: '11px 24px' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview */}
        {tab === 'Overview' && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/28 mb-2">Loyalty Points</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-6xl gold-gradient">{pts}</span>
                    <span className="text-white/28 text-sm">pts</span>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] ${
                  tier === 'Gold' ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/25' :
                  tier === 'Silver' ? 'bg-white/8 text-white/55 border border-white/12' :
                  'bg-[#C4956A]/12 text-[#C4956A] border border-[#C4956A]/22'
                }`}>
                  {tier} member
                </span>
              </div>
              {nextTier && (
                <div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gradient-to-r from-[#C9A84C] to-[#C4956A] rounded-full"
                    />
                  </div>
                  <p className="text-[11px] text-white/28 mt-2 tracking-wider">
                    {nextTier.at - pts} points to {nextTier.name}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Calendar, label: 'Upcoming', value: appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length },
                { icon: Package, label: 'Preorders', value: preorders.filter(p => p.status === 'active').length },
                { icon: Tag, label: 'Coupons', value: coupons.filter(c => !c.used).length },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="glass-light rounded-2xl p-6 text-center">
                  <Icon size={18} className="text-[#C9A84C] mx-auto mb-3" />
                  <div className="font-display text-3xl text-white">{value}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/28 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Appointments */}
        {tab === 'Appointments' && (
          <div className="space-y-4">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 shimmer rounded-2xl" />) :
            appointments.length === 0 ? (
              <div className="text-center py-20 text-white/25 text-sm">No appointments yet.</div>
            ) : appointments.map(appt => (
              <motion.div key={appt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-light rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{appt.services?.name}</p>
                    <p className="text-white/35 text-sm mt-1">with {appt.stylists?.name}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border ${STATUS[appt.status] || 'text-white/28 bg-white/5 border-white/8'}`}>
                    {appt.status}
                  </span>
                </div>
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-white/28 text-xs">
                    <Calendar size={12} />
                    {format(new Date(appt.date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/28 text-xs">
                    <Clock size={12} />
                    {appt.time?.slice(0, 5)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Preorders */}
        {tab === 'Preorders' && (
          <div className="space-y-4">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 shimmer rounded-2xl" />) :
            preorders.length === 0 ? (
              <div className="text-center py-20 text-white/25 text-sm">No preorders yet.</div>
            ) : preorders.map(order => (
              <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-light rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] overflow-hidden shrink-0 border border-white/5">
                    {order.products?.image_url
                      ? <img src={order.products.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-white/15" /></div>}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{order.products?.name}</p>
                    <p className="text-white/28 text-xs mt-0.5">Qty: {order.quantity} · €{order.products?.price}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`block px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border ${STATUS[order.status] || ''}`}>
                    {order.status}
                  </span>
                  {order.status === 'active' && order.expires_at && (
                    <p className="text-[10px] text-white/22 mt-1.5">{format(new Date(order.expires_at), 'MMM d, HH:mm')}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Rewards */}
        {tab === 'Rewards' && (
          <div className="space-y-4">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 shimmer rounded-2xl" />) :
            coupons.length === 0 ? (
              <div className="text-center py-20">
                <Star size={36} className="text-white/10 mx-auto mb-5" />
                <p className="text-white/28 text-sm">No coupons yet. Keep booking to earn points and unlock rewards.</p>
              </div>
            ) : coupons.map(({ id, coupons: c, used }) => (
              <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`glass-light rounded-2xl p-6 flex items-center justify-between ${used ? 'opacity-40' : ''}`}>
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <Tag size={14} className="text-[#C9A84C]" />
                    <span className="font-mono text-[#C9A84C] tracking-[0.15em]">{c?.code}</span>
                  </div>
                  <p className="text-white/35 text-xs">
                    {c?.discount_type === 'percentage' ? `${c.discount_value}% off` : `€${c?.discount_value} off`}
                    {c?.expiry_date && ` · Expires ${format(new Date(c.expiry_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border ${
                  used ? 'bg-white/5 text-white/18 border-white/8' : 'bg-[#C9A84C]/12 text-[#C9A84C] border-[#C9A84C]/22'
                }`}>
                  {used ? 'Used' : 'Active'}
                </span>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
