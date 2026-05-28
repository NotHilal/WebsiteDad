import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock, Filter, Calendar, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'completed', 'cancelled']

export default function StudioAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, phone, id), services(name, price), stylists(name)')
      .order('date', { ascending: false })
      .order('time', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      toast.success(`Appointment ${status}`)
    }
  }

  const filtered = appointments.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter
    const matchSearch = !search || a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-white">Appointments</h1>
        <span className="text-white/30 text-sm">{filtered.length} records</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client name..."
            className="w-full bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/30 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all ${
                filter === s ? 'bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black font-medium' : 'bg-[#111] border border-white/8 text-white/40 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Client', 'Service', 'Stylist', 'Date & Time', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs uppercase tracking-widest text-white/25 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/25">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/25">No appointments found.</td></tr>
              ) : filtered.map(appt => (
                <motion.tr key={appt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-white text-sm">{appt.profiles?.full_name || 'Unknown'}</p>
                    {appt.profiles?.phone && <p className="text-white/30 text-xs mt-0.5">{appt.profiles.phone}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white/70 text-sm">{appt.services?.name}</p>
                    {appt.services?.price && <p className="text-[#C9A84C] text-xs">€{appt.services.price}</p>}
                  </td>
                  <td className="px-5 py-4 text-white/60 text-sm">{appt.stylists?.name}</td>
                  <td className="px-5 py-4">
                    <p className="text-white/70 text-sm">{format(new Date(appt.date), 'MMM d, yyyy')}</p>
                    <p className="text-white/30 text-xs">{appt.time?.slice(0, 5)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs capitalize ${
                      appt.status === 'confirmed' ? 'bg-emerald-400/10 text-emerald-400' :
                      appt.status === 'pending' ? 'bg-amber-400/10 text-amber-400' :
                      appt.status === 'cancelled' ? 'bg-red-400/10 text-red-400' :
                      appt.status === 'completed' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' :
                      'bg-white/5 text-white/40'
                    }`}>{appt.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {appt.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(appt.id, 'confirmed')}
                            className="w-7 h-7 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors flex items-center justify-center">
                            <Check size={13} />
                          </button>
                          <button onClick={() => updateStatus(appt.id, 'cancelled')}
                            className="w-7 h-7 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors flex items-center justify-center">
                            <X size={13} />
                          </button>
                        </>
                      )}
                      {appt.status === 'confirmed' && (
                        <button onClick={() => updateStatus(appt.id, 'completed')}
                          className="w-7 h-7 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors flex items-center justify-center">
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
