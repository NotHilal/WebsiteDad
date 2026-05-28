import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Star, Shield, Search, ArrowUpDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function StudioUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function adjustPoints(id, delta, current) {
    const newPts = Math.max(0, current + delta)
    const { error } = await supabase.from('profiles').update({ points: newPts }).eq('id', id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, points: newPts } : u))
      toast.success(`Points ${delta > 0 ? 'added' : 'removed'}`)
    }
  }

  async function toggleRole(id, current) {
    const newRole = current === 'admin' ? 'user' : 'admin'
    if (newRole === 'admin' && !confirm(`Grant admin access to this user?`)) return
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
      toast.success(`Role updated to ${newRole}`)
    }
  }

  const filtered = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-white">Users</h1>
        <span className="text-white/30 text-sm">{users.length} registered</span>
      </div>

      <div className="relative mb-6">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-sm bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/30"
        />
      </div>

      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['User', 'Points', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs uppercase tracking-widest text-white/25 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-white/25">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-white/25">No users found.</td></tr>
              ) : filtered.map(u => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C]/20 to-[#C4956A]/20 flex items-center justify-center shrink-0">
                        <span className="text-xs text-[#C9A84C] font-medium">{u.full_name?.[0] || '?'}</span>
                      </div>
                      <div>
                        <p className="text-white text-sm">{u.full_name || 'No name'}</p>
                        {u.phone && <p className="text-white/30 text-xs">{u.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="text-[#C9A84C]" />
                      <span className="text-white/70 text-sm">{u.points || 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'bg-white/5 text-white/40'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/30 text-sm">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustPoints(u.id, 10, u.points || 0)}
                        className="px-2.5 py-1 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] text-xs hover:bg-[#C9A84C]/20 transition-colors">
                        +10pts
                      </button>
                      <button onClick={() => adjustPoints(u.id, -10, u.points || 0)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white transition-colors">
                        -10pts
                      </button>
                      <button onClick={() => toggleRole(u.id, u.role)}
                        className={`p-1.5 rounded-lg transition-colors ${u.role === 'admin' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'bg-white/5 text-white/30 hover:text-white'}`}
                        title={u.role === 'admin' ? 'Revoke admin' : 'Make admin'}>
                        <Shield size={13} />
                      </button>
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
